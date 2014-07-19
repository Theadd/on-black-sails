/**
 * Created by Theadd on 7/19/14.
 */

var ipc = require('node-ipc')

var pool = [],
  localPool = [],
  isClientEnabled = false,
  isEnlargePoolActive = false

ipc.config.appspace = 'media.'
ipc.config.id = 'media'
ipc.config.retry = 1500
ipc.config.silent = true
ipc.config.networkHost = 'localhost'
ipc.config.networkPort = 8013

exports.cacheStats = {}

/**
 * Initialize IPC server
 */
exports.init = function () {
  console.log("Initializing media IPC server")
  ipc.serveNet('localhost', 8013,
    function () {
      ipc.server.on (
        'hash',
        function (data, socket) {
          pool.push(data)
        }
      )
    }
  )

  ipc.server.start()
}

exports.add = function (hash) {
  localPool.push(hash)
  if (!isClientEnabled) {
    this.connect()
    return
  }
  if (ipc.of.media.connected || false) {
    while (localPool.length) {
      ipc.of.media.emit(
        'hash',
        localPool.pop()
      )
    }
  }
}

/**
 * Connect client to IPC server
 */
exports.connect = function () {
  isClientEnabled = true
  ipc.connectToNet(
    'media', 'localhost', 8013,
    function(){
      ipc.of.media.on(
        'connect',
        function(){
          console.log("Connected to media IPC server")
          ipc.of.media.connected = true

        }
      )
      ipc.of.media.on(
        'disconnect',
        function(){
          console.log('Not connected to media IPC server')
          ipc.of.media.connected = false
        }
      )
    }
  )
}

exports.start = function () {
  Indexer.createTask(function () {
    var task = this
    if (!task._useCache) {
      task.setCache(7200, 1200) // 2h, 20m
    }
    if (pool.length < 50) {
      if (!isEnlargePoolActive) {
        if (Indexer.role['verbose']) console.log(task.requestsCache.getStats())
        enlargePool()
      }
    }
    if (pool.length) {
      if (pool.length % 5 == 0) {
        MediaManager.cacheStats = task.requestsCache.getStats()
      }
      var hash = pool.pop()
      Hash.find()
        .where({ uuid: hash })
        .exec(function(err, entries) {
          if (!err && entries.length) {
            task.hash = entries[0].uuid //.toUpperCase()
            task.mediaField = entries[0].media || {}
            task.imdb = ''
            task.rate = entries[0].rate || 0
            task.role = 'update-media'
            Indexer.workers[task.role][task.hash] = new Date()
            //propagate update to other IPC handlers
            StatusManager.add(task.hash)
            TrackersManager.add(task.hash)
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
      task.setStatus('standby')
    }

  }, Indexer.role['update-media-interval'], updateMovie)
}

var enlargePool = function() {
  isEnlargePoolActive = true
  Hash.find()
    .where({ downloaded: true })
    .where({category: ["movies", "video movies"] })
    .sort('updatedAt ASC')
    .limit(120)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        for (var i = 0; i < entries.length; ++i) {
          if (pool.indexOf(entries[i].uuid) == -1) {
            pool.push(entries[i].uuid)
          }
        }
        isEnlargePoolActive = false
      } else {
        console.log("ERROR updating media pool!")
        isEnlargePoolActive = false
      }
    })
}


var updateMovie = function(content) {
  var task = this,
    res = {}

  pool.push(task.hash)
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

    Indexer.session.movies++
    delete Indexer.workers['update-media'][task.hash]
    Hash.update({ uuid: task.hash }, data, function(err, hashes) { })
  } else {
    Hash.update({ uuid: task.hash },{ rate: task.rate }, function(err, hashes) { }) //avoid overlapping
    MediaHelpers.matchingIMDBIDFromTMDB(task.media['name'], task.media['year'], updateHashIMDB, { hash: task.hash })
  }
}

function updateHashIMDB (opts) {
  Indexer.session.movies++
  delete workers['update-media'][opts['hash']]
  Hash.update({ uuid: opts['hash'] },{ imdb: opts['imdb'] }, function(err, hashes) { });
}
