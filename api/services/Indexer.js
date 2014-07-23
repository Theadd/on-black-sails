/**
 * Created by Theadd on 5/30/14.
 */

var Task = require('tasker').Task

var session = exports.session = {'movies': 0, 'status': 0, 'metadata': 0, 'files': 0, 'peers': 0},
  statisticsTimer = null,
  workers = exports.workers = {'update-metadata': 0, 'update-status': 0, 'update-media': [], 'index-file': 0, 'update-tracker': 0 },
  role = exports.role = {}

exports.run = function() {
  var os = require('os')
  sails.config['platform'] = os.platform()

  role = Indexer.role = CommandLineHelpers.getValues()
  console.log(CommandLineHelpers.usage())



  if (role['tracker']) {
    TrackerHandler.init()
    TrackerHandler.start()
  }

  if (role['controller']) {
    HandlerController.init()
  } else {
    statisticsTimer = setInterval( function() { sendStatistics() }, 30000)
  }

  if (role['update-index']) {
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
    MetadataHandler.init()
    MetadataHandler.start()
  }

  if (role['update-status']) {
    StatusHandler.init()
    StatusHandler.start()
  }

  if (role['update-media']) {
    MediaHandler.init()
    MediaHandler.start()
  }

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
              MetadataHandler.add(entry.uuid)
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

function sendStatistics() {
  var statistics = {
    'session': session,
    'workers': workers,
    'announce': (role['tracker']) ? TrackerHandler.getAnnounce() : {},
    'media-cache-stats': (role['update-media']) ? MediaHandler.cacheStats : {}
  }
  HandlerController.add(statistics)
  session = Indexer.session = {'movies': 0, 'status': 0, 'metadata': 0, 'files': 0, 'peers': 0}
}

var getDownloadLink = exports.getDownloadLink = function(hash, cache, source) {
  if (cache.length) {
    return 'http://' + cache + '/torrent/' + hash.toUpperCase() + '.torrent'
  } else {
    return ((source.indexOf('bitsnoop.com') == -1) ? 'http://torcache.net/torrent/' + hash.toUpperCase() + '.torrent' : 'http://torrage.com/torrent/' + hash.toUpperCase() + '.torrent')
  }
}