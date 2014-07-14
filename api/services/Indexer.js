/**
 * Created by Theadd on 5/30/14.
 */

var status2value = { 'VERIFIED': 2, 'GOOD': 1, 'NONE': 0, 'ERROR': 0, 'NOTFOUND': 0, 'BAD': -1, 'FAKE': -2 };
var Task = require('tasker').Task;
var trackerClient = require('bittorrent-tracker');

var updateMediaPool = [],
  updatingMediaPool = false,
  updateStatusPool = [],
  session = {'movies': 0, 'status': 0, 'metadata': 0},
  statisticsTimer = null,
  workers = {'update-metadata': 0, 'update-status': 0, 'update-media': [], 'index-file': 0, 'update-tracker': 0 },
  role = {}

exports.run = function() {
  role = CommandLineHelpers.getValues()

  if (!role['quiet']) {
    statisticsTimer = setInterval( function() { showStatistics() }, 10000)
  }
  console.log(CommandLineHelpers.usage())
  console.log(role)

  if (role['update-index']) {
    createTask('http://bitsnoop.com/api/latest_tz.php?t=all', 600000, indexSiteAPI) //10min = 600000
    createTask('http://kickass.to/hourlydump.txt.gz', 1800000, indexSiteAPI) //30min = 1800000
  }
  if (role['full-index']) {
    createTask('http://ext.bitsnoop.com/export/b3_all.txt.gz', 0, indexSiteAPI) //run once
    createTask('http://kickass.to/dailydump.txt.gz', 0, indexSiteAPI) //run once
  }

  if (role['update-metadata']) {
    createTask(function () {
      var task = this
      task.status = 'targeting'
      Hash.find()
        .where({ downloaded: false })
        .sort('updatedAt ASC')
        .limit(1)
        .exec(function(err, entries) {
          if (!err && entries.length) {
            task.hash = entries[0].uuid.toUpperCase()
            task.title = entries[0].title
            task.category = entries[0].category
            task.role = 'update-metadata'
            workers[task.role]++
            //task.status = 'standby'
            task.use(getDownloadLink(entries[0].uuid, entries[0].cache || '', entries[0].source))
          }
        })
    }, role['update-metadata-interval'], updateMetadata, errorOnUpdateMetadata)
  }

  if (role['update-status']) {
    createTask(function () {
      var task = this
      task.status = 'targeting'
      if (updateStatusPool.length) {
        var hash = updateStatusPool.pop()
        Hash.find()
          .where({ uuid: hash })
          .exec(function(err, entries) {
            if (!err && entries.length) {
              task.hash = entries[0].uuid.toUpperCase()
              task.title = entries[0].title
              task.role = 'update-status'
              workers[task.role]++
              //task.status = 'standby'
              task.use('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].uuid.toUpperCase())
            }
          })
      } else {
        Hash.find()
          .where({ downloaded: true })
          .sort('updatedAt ASC')
          .where({category: { not: { contains: "movies" } } })
          .limit(1)
          .exec(function(err, entries) {
            if (!err && entries.length) {
              task.hash = entries[0].uuid.toUpperCase()
              task.title = entries[0].title
              task.role = 'update-status'
              workers[task.role]++
              //task.status = 'standby'
              task.use('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].uuid.toUpperCase())
            }
          })
      }
    }, role['update-status-interval'], updateStatus)
  }

  if (role['update-media']) {
    createTask(function () {
      var task = this
      if (updateMediaPool.length < 50) {
        if (!updatingMediaPool) {
          updatePoolOfMedia()
        }
      }
      if (updateMediaPool.length) {
        var hash = updateMediaPool.pop()
        Hash.find()
          .where({ uuid: hash })
          .exec(function(err, entries) {
            if (!err && entries.length) {
              task.hash = entries[0].uuid.toUpperCase()
              task.mediaField = entries[0].media || {}
              task.imdb = ''
              task.rate = entries[0].rate || 0
              task.role = 'update-media'
              workers[task.role][task.hash] = new Date()
              if (typeof entries[0].imdb !== "undefined" && entries[0].imdb.length) {
                task.imdb = entries[0].imdb
                task.use('http://www.omdbapi.com/?i=' +  entries[0].imdb)
              } else {
                var media = MediaHelpers.guessMedia(entries[0].title)
                task.media = media
                task.use('http://www.omdbapi.com/?i=&t=' + media.name + ((media.year > 0) ? '&y=' + media.year : ''))
              }
            }
          })
      } else {
        task.status = 'standby'
      }

    }, role['update-media-interval'], updateMovie)
  }

}


var updatePoolOfMedia = function() {
  updatingMediaPool = true
  Hash.find()
    .where({ downloaded: true })
    .where({category: { contains: "movies" } })
    .sort('updatedAt ASC')
    .limit(120)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        for (var i = 0; i < entries.length; ++i) {
          if (updateMediaPool.indexOf(entries[i].uuid) == -1) {
            updateMediaPool.push(entries[i].uuid)
          }
        }
        updatingMediaPool = false
      } else {
        console.log("ERROR updating media pool!")
        updatingMediaPool = false
      }
    })
}

var createTask = function(target, interval, dataCb, errorCb) {
  var task = new Task(target, interval)

  if (typeof errorCb !== "undefined") {
    task.on('error', errorCb);
  } else {
    task.on('error', function (err) {
      console.log(err)
      if (typeof task.role !== "undefined") {
        workers[task.role]--
      }
      console.log(this.url)
      var self = this
      if (typeof self.hash !== "undefined") {
        console.log("SKIP UPDATING " + self.hash)
        Hash.update({ uuid: self.hash }, { size: 0 }, function(err, hashes) { })
      }
    })
  }

  task.on('data', dataCb);

  task.start()
}

function ignore(err) {
  //console.log("ERROR: " + err.message);
}

var updateTrackersFromHash = function(hash) {

  workers['update-tracker']++
  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        //update peers from trackers
        var peerId = new Buffer('01234567890123456789');
        var port = 6881;
        var data = { announce: [], infoHash: entries[0].uuid };
        for (var t in entries[0].trackers) {
          data.announce.push(entries[0].trackers[t]);
        }
        var client = new trackerClient(peerId, port, data);
        client.on('error', ignore);
        client.once('update', function (data) {
          Hash.update({ uuid: entries[0].uuid },{ seeders: data.complete, leechers: data.incomplete }, function(err, hashes) { workers['update-tracker']-- });
        });
        client.update();
      }
    });
}

var indexSiteAPI = function(content) {
  var lines = content.split("\n"),
    added = 0

  for (var i in lines) {
    if (lines.hasOwnProperty(i)) {
      var line = lines[i].split("|"),
        index = "",
        data = {}

      for (var p = 0; p < line.length; ++p) {
        if (p == 0) {
          index = line[p]
          data['uuid'] = line[p]
        } else if (p == 1) {
          data['title'] = line[p]
        } else if (p == 2) {
          data['category'] = line[p].toLowerCase()
        } else if (p == 3) {
          data['source'] = line[p]
        } else if (p == 4) {
          var tmp = line[p].match(/^http:\/\/(.*?)\//)
          data['cache'] = (tmp) ? tmp[1] : ''
        }
      }
      if (index.length) {
        Hash.create(data).exec(function(err, entry) {
          if (!err) {
            ++added
          }
        })
      }
    }
  }
  console.log("indexSiteAPI[" + this.url + "] " + added + "/" + lines.length + "/" + (this._totalNumLines || 0))
}


var updateMetadata = function(content) {
  var task = this
  workers[task.role]--
  //Update Hash model
  Hash.update({ uuid: task.hash },{
    size: content.size,
    trackers: content.trackers,
    files: content.files.length,
    downloaded: true,
    added: new Date(content.creationDate)
  }, function(err, hashes) {
    //console.log("\t\tDONE: "+task.role)
    if (err) {
      console.log("ERROR UPDATING METADATA OF " + task.hash)
      console.log(err)
    } else {
      ++session.metadata
    }
  })
  //Update File model
  for (var i in content.files) {
    workers['index-file']++
    var data = {};
    data['hash'] = task.hash
    data['file'] = content.files[i].name
    data['title'] = task.title
    data['category'] = task.category
    data['added'] = new Date(content.creationDate)
    data['size'] = content.files[i].size;
    File.create(data).exec(function(err, fileentry) {
      workers['index-file']--
      if (!err) {
        //console.log("File added: ", fileentry.file)
      } else {
        console.log("!ERROR in file.create()")
        console.log(err)
      }
    })
  }
}

var errorOnUpdateMetadata = function(error) {
  //Probably, download link unavailable
  var task = this
  workers[task.role]--

  Hash.update({ uuid: task.hash },{
    cache: ''
  }, function(err, hashes) {
    console.log("\n# Probably, download link unavailable for " + task.hash)
    console.log("\t" + task.url)
    console.log("\t" + error)
    if (err) {
      console.log("[In errorOnUpdateMetadata()]: ERROR UPDATING METADATA OF " + task.hash)
      console.log(err)
    } else {
      ++session.metadata
    }
  })
}


var updateStatus = function(content) {
  var task = this,
    value = status2value[content]

  workers[task.role]--

  if (value > -10 && value < 10) {
    Hash.update({ uuid: task.hash },{ status: value }, function(err, hashes) { });
    ++session.status
    updateTrackersFromHash(task.hash)
  }
}

var updateMovie = function(content) {
  var task = this,
    res = {}

  updateStatusPool.push(task.hash)
  try {
    res = JSON.parse(content)
  } catch (e) {
    Hash.update({ uuid: task.hash },{ rate: task.rate }, function(err, hashes) { })
    return  //not a valid json
  }

  if (res['Response'] == 'True' && res['Type'] == 'movie' && (task.imdb.length || res['Title'].toLowerCase() == task.media['name'].toLowerCase())) {
    var data = {genre: res['Genre'], media: task.mediaField}
    data['media']['imdb'] = res['imdbID']
    data['media']['imdbRating'] = parseFloat(res['imdbRating'])
    data['media']['imdbVotes'] = parseInt(res['imdbVotes'].replace(/,/, ''))
    data['media']['metascore'] = parseInt(res['Metascore'])
    data['media']['title'] = res['Title']
    data['rate'] = (data['media']['imdbVotes'] >= 500) ? data['media']['imdbRating'] * 10 : task.rate
    data['imdb'] = res['imdbID']

    ++session.movies
    delete workers['update-media'][task.hash]
    Hash.update({ uuid: task.hash }, data, function(err, hashes) { })
  } else {
    Hash.update({ uuid: task.hash },{ rate: task.rate }, function(err, hashes) { }) //avoid overlapping
    MediaHelpers.matchingIMDBIDFromTMDB(task.media['name'], task.media['year'], updateHashIMDB, { hash: task.hash })
  }
}

function updateHashIMDB (opts) {
  ++session.movies
  delete workers['update-media'][opts['hash']]
  Hash.update({ uuid: opts['hash'] },{ imdb: opts['imdb'] }, function(err, hashes) { });
}

function showStatistics() {
  console.log("\n" + new Date())
  console.log(session)
  if (role['verbose']) {
    console.log(workers)
  }
  console.log("\n")
  session = {'movies': 0, 'status': 0, 'metadata': 0}
}

var getDownloadLink = exports.getDownloadLink = function(hash, cache, source) {
  if (cache.length) {
    return 'http://' + cache + '/torrent/' + hash.toUpperCase() + '.torrent'
  } else {
    return ((source.indexOf('bitsnoop.com') == -1) ? 'http://torcache.net/torrent/' + hash.toUpperCase() + '.torrent' : 'http://torrage.com/torrent/' + hash.toUpperCase() + '.torrent')
  }
}