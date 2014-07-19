/**
 * Created by Theadd on 5/30/14.
 */


var Task = require('tasker').Task

var updateMediaPool = [],
  updatingMediaPool = false,
  updateStatusPool = [],
  session = exports.session = {'movies': 0, 'status': 0, 'metadata': 0, 'files': 0, 'peers': 0},
  statisticsTimer = null,
  workers = exports.workers = {'update-metadata': 0, 'update-status': 0, 'update-media': [], 'index-file': 0, 'update-tracker': 0 },
  role = exports.role = {}

exports.run = function() {
  role = Indexer.role = CommandLineHelpers.getValues()

  if (role['tracker']) {
    TrackerManager.init()
  }

  if (!role['quiet']) {
    statisticsTimer = setInterval( function() { showStatistics() }, 10000)
  }
  console.log(CommandLineHelpers.usage())

  if (role['update-index']) {
    if (role['live']) {
      MetadataManager.connect() //~
    }
    createTask('http://bitsnoop.com/api/latest_tz.php?t=all', 600000, indexSiteAPI) //10min = 600000
    createTask('http://kickass.to/hourlydump.txt.gz', 1800000, indexSiteAPI) //30min = 1800000
  }
  if (role['full-index']) {
    if (role['full-index-bitsnoop']) {
      createTask('http://ext.bitsnoop.com/export/b3_all.txt.gz', 0, indexSiteAPI)
    } else if (role['full-index-kickass']) {
      createTask('http://kickass.to/dailydump.txt.gz', 0, indexSiteAPI)
    }
  }

  if (role['update-metadata']) {
    MetadataManager.init()
    MetadataManager.start()
  }

  if (role['update-status']) {
    asfasf
  }

  if (role['update-media']) {
    createTask(function () {
      var task = this
      if (!task._useCache) {
        task.setCache(7200, 1200) // 2h, 20m
      }
      if (updateMediaPool.length < 50) {
        if (!updatingMediaPool) {
          if (role['verbose']) console.log(task.requestsCache.getStats())
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
    .where({category: ["movies", "video movies"] })
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

var createTask = exports.createTask = function(target, interval, dataCb, errorCb, logStatus) {
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

  if (logStatus || false) {
    task.on('status', function (msg) {
      console.log("Status: " + msg)
    })
  }

  task.on('data', dataCb);

  task.start()
}

var indexSiteAPI = function(content) {
  var task = this,
    lines = content.split("\n"),
    added = 0,
    addAttempts = 0,
    contentLength = lines.length - 1,
    startTime = new Date().getTime()

  for (var i in lines) {
    if (lines.hasOwnProperty(i)) {
      var line = lines[i].split("|"),
        index = "",
        data = {}

      for (var p = 0; p < line.length; ++p) {
        if (p == 0) {
          index = line[p]
          data['uuid'] = line[p].toUpperCase()
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
          ++addAttempts
          if (!err) {
            ++added
            if (role['live']) {
              MetadataManager.add(entry.uuid)
            }
          }
          if (addAttempts == contentLength) {
            console.log("[" + task.url + "] Indexed " + added + " out of " + contentLength + " in " + ((new Date().getTime() - startTime)) + "ms (" + (task._totalNumLines || 0) + " lines so far)")
            addAttempts = 0
            added = 0
            task.resume()
          }
        })
      }
    }
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
    if (role['tracker']) console.log(TrackerManager.announce) //TODO: remove
  }
  console.log("\n")
  session = Indexer.session = {'movies': 0, 'status': 0, 'metadata': 0, 'files': 0, 'peers': 0}
}

var getDownloadLink = exports.getDownloadLink = function(hash, cache, source) {
  if (cache.length) {
    return 'http://' + cache + '/torrent/' + hash.toUpperCase() + '.torrent'
  } else {
    return ((source.indexOf('bitsnoop.com') == -1) ? 'http://torcache.net/torrent/' + hash.toUpperCase() + '.torrent' : 'http://torrage.com/torrent/' + hash.toUpperCase() + '.torrent')
  }
}