/**
 * Created by Theadd on 5/30/14.
 */

var status2value = { 'VERIFIED': 2, 'GOOD': 1, 'NONE': 0, 'ERROR': 0, 'NOTFOUND': 0, 'BAD': -1, 'FAKE': -2 };
var Task = require('tasker').Task;
var trackerClient = require('bittorrent-tracker');

var updateMediaPool = [],
  updatingMediaPool = false,
  updateStatusPool = []

exports.run = function() {

  var role = {
    'full-index': sails.config['full-index'] || false,
    'update-index': sails.config['update-index'] || false,
    'update-metadata': sails.config['update-metadata'] || false,
    'update-status': sails.config['update-status'] || false,
    'update-media': sails.config['update-media'] || false
  }

  /*
  --full-index=false
  --update-index=true
  --update-metadata=true
  --update-status=false
  --update-media=true
  */

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
            task.hash = entries[0].id.toUpperCase()
            task.title = entries[0].title
            task.category = entries[0].category
            task.status = 'standby'
            task.use('http://torrage.com/torrent/' + entries[0].id.toUpperCase() + '.torrent')
          }
        })
    }, 500, updateMetadata)
  }

  if (role['update-status']) {
    createTask(function () {
      var task = this
      task.status = 'targeting'
      if (updateStatusPool.length) {
        var hash = updateStatusPool.pop()
        Hash.find()
          .where({ id: hash })
          .exec(function(err, entries) {
            if (!err && entries.length) {
              task.hash = entries[0].id.toUpperCase()
              task.title = entries[0].title
              task.status = 'standby'
              task.use('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].id.toUpperCase())
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
              task.hash = entries[0].id.toUpperCase()
              task.title = entries[0].title
              task.status = 'standby'
              task.use('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].id.toUpperCase())
            }
          })
      }
    }, 335, updateStatus)
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
          .where({ id: hash })
          .exec(function(err, entries) {
            if (!err && entries.length) {
              task.hash = entries[0].id.toUpperCase()
              task.mediaField = entries[0].media || {}
              task.imdb = ''
              task.rate = entries[0].rate || 0
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

    }, 500, updateMovie)
  }

  console.log(role)
}


var updatePoolOfMedia = function() {
  updatingMediaPool = true
  Hash.find()
    .where({ downloaded: true })
    .where({category: { contains: "movies" } })
    //.where({status: {'>=': 0}})
    .sort('updatedAt ASC')
    .limit(120)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        for (var i = 0; i < entries.length; ++i) {
          if (updateMediaPool.indexOf(entries[i].id) == -1) {
            updateMediaPool.push(entries[i].id)
          }
        }
        updatingMediaPool = false
      } else {
        console.log("ERROR updating media pool!")
        updatingMediaPool = false
      }
    })
}

var createTask = function(target, interval, dataCb) {
  var task = new Task(target, interval)

  task.on('error', function (err) {
    console.log(err)
    console.log(this.url)
    var self = this
    if (typeof self.hash !== "undefined") {
      console.log("SKIP UPDATING " + self.hash)
      Hash.update({ id: self.hash }, { size: 0 }, function(err, hashes) { })
    }
  })

  task.on('data', dataCb);

  task.start()
}

function ignore(err) {
  //console.log("ERROR: " + err.message);
}

var updateTrackersFromHash = function(hash) {
  Hash.find()
    .where({ id: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        //update peers from trackers
        var peerId = new Buffer('01234567890123456789');
        var port = 6881;
        var data = { announce: [], infoHash: entries[0].id };
        for (var t in entries[0].trackers) {
          data.announce.push(entries[0].trackers[t]);
        }
        //console.log(JSON.stringify(data))
        var client = new trackerClient(peerId, port, data);
        client.on('error', ignore);
        client.once('update', function (data) {
          Hash.update({ id: entries[0].id },{ seeders: data.complete, leechers: data.incomplete }, function(err, hashes) { });
          //console.log("\tTRACKERS DATA OF " + hash + ": " + JSON.stringify(data))
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
          data['id'] = line[p].toUpperCase()
        } else if (p == 1) {
          data['title'] = line[p]
        } else if (p == 2) {
          data['category'] = line[p].toLowerCase()
        } else if (p == 3) {
          data['source'] = line[p]
        }
      }
      if (index.length) {
        Hash.create(data).exec(function(err, entry) {
          if (!err) {
            ++added
            //console.log("Added: ", entry.title)
          }
        })
      }
    }
  }
  console.log("indexSiteAPI[" + this.url + "] " + added + "/" + lines.length + "/" + (this._totalNumLines || 0))
}


var updateMetadata = function(content) {
  var task = this
  //Update Hash model
  Hash.update({ id: task.hash },{
    size: content.size,
    trackers: content.trackers,
    files: content.files,
    downloaded: true,
    added: new Date(content.creationDate)
  }, function(err, hashes) {
    if (err) {
      console.log("ERROR UPDATING METADATA OF " + task.hash)
      console.log(err)
    }
  })
  //Update File model
  for (var i in content.files) {
    var data = {};
    data['hash'] = task.hash
    data['file'] = content.files[i].name
    data['title'] = task.title
    data['category'] = task.category
    data['added'] = new Date(content.creationDate)
    data['size'] = content.files[i].size;
    File.create(data).exec(function(err, fileentry) {
      if (!err) {
        //console.log("File added: ", fileentry.file)
      } else {
        console.log(err)
      }
    })
  }
}


var updateStatus = function(content) {
  var task = this,
    value = status2value[content]

  if (value > -10 && value < 10) {
    Hash.update({ id: task.hash },{ status: value }, function(err, hashes) { });
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
    Hash.update({ id: task.hash },{ rate: task.rate }, function(err, hashes) { })
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

    Hash.update({ id: task.hash }, data, function(err, hashes) { })
  } else {
    Hash.update({ id: task.hash },{ rate: task.rate }, function(err, hashes) { }) //avoid overlapping
    MediaHelpers.matchingIMDBIDFromTMDB(task.media['name'], task.media['year'], updateHashIMDB, { hash: task.hash })
  }
}

function updateHashIMDB (opts) {
  Hash.update({ id: opts['hash'] },{ imdb: opts['imdb'] }, function(err, hashes) { });
}
