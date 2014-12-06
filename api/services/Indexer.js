/**
 * Created by Theadd on 5/30/14.
 */

var Task = require('tasker').Task
var extend = require('node.extend')

var entryDefaultStats = {
  responses: 0,
  torrents: 0,
  indexed: 0,
  interval: 0
}

exports.indexerStats = {}

exports.run = function() {
  var url = ''

  TrackerService.setup()
  MetadataService.setup()
  StatusService.setup()
  MediaService.setup()
  PropagateService.setup()

  if (CommandLineHelpers.config.tracker.active) {
    TrackerService.server()
    TrackerService.run()
  }

  if (CommandLineHelpers.config.index.kickass.active) {
    if (CommandLineHelpers.config.index.kickass.full) {
      url = 'http://kickass.so/dailydump.txt.gz'
      Indexer.indexerStats[url] = extend(true, {}, entryDefaultStats)
      createTask(url, 0, indexSiteAPI)
    } else {
      url = 'http://kickass.so/hourlydump.txt.gz'
      Indexer.indexerStats[url] = extend(true, {}, entryDefaultStats)
      createTask(url, 1800000, indexSiteAPI) //30min = 1800000
    }
  }

  if (CommandLineHelpers.config.index.bitsnoop.active) {
    if (CommandLineHelpers.config.index.bitsnoop.full) {
      url = 'http://ext.bitsnoop.com/export/b3_all.txt.gz'
      Indexer.indexerStats[url] = extend(true, {}, entryDefaultStats)
      createTask(url, 0, indexSiteAPI)
    } else {
      url = 'http://bitsnoop.com/api/latest_tz.php?t=all'
      Indexer.indexerStats[url] = extend(true, {}, entryDefaultStats)
      createTask(url, 600000, indexSiteAPI) //10min = 600000
    }
  }

  if (CommandLineHelpers.config.metadata.active) {
    MetadataService.server()
    MetadataService.start()
  }

  if (CommandLineHelpers.config.status.active) {
    StatusService.server()
    StatusService.start()
  }

  if (CommandLineHelpers.config.media.active) {
    MediaService.server()
    MediaService.start()
  }

  if (CommandLineHelpers.config.propagate.active) {
    PropagateService.server() //TODO: useless?
    PropagateService.start()
  }

  if (CommandLineHelpers.config.autoqueue != false) {
    var queueModels = CommandLineHelpers.config.autoqueue.split(',')
    for (var queueModel in queueModels) {
      sails.log.debug("Running queue model " + queueModels[queueModel])
      ServiceQueueModel.run(queueModels[queueModel])
    }
  }

  if (sails.config.command || false) {
    var targetService = ServiceQueueModel.getTargetService(sails.config.target || 'tracker')
    targetService.client()
    setTimeout(function () {
      sails.log.debug("EXECUTING COMMAND " + sails.config.command + " ON " + (sails.config.target || 'tracker'))
      targetService.exec({name: sails.config.command})
    }, 2000);
  }

  if (CommandLineHelpers.config.autogc || Settings.get('autogc')) {
    setInterval(function () {
      try {
        global.gc()
      } catch (e) {
        sails.log.error("Restart this process enabling garbage collection: \"node --expose-gc app.js ...\"")
      }
    }, (Number(CommandLineHelpers.config.autogc || Settings.get('autogc')) >= 1000) ? Number(CommandLineHelpers.config.autogc || Settings.get('autogc')) : 90000)
  }
}


var createTask = exports.createTask = function(target, interval, dataCb, errorCb, logStatus) {
  var task = new Task(target, interval)

  if (typeof errorCb !== "undefined") {
    task.on('error', errorCb);
  } else {
    task.on('error', function (err) {
      sails.log.debug(err)
      if (typeof task.role !== "undefined") {
        workers[task.role]--
      }
      sails.log.debug(task.url)
      var self = this
      if (typeof self.hash !== "undefined") {
        sails.log.debug("SKIP UPDATING " + self.hash)
        Hash.update({ uuid: self.hash }, { size: 0 }, function(err, hashes) { })
      }
    })
  }

  if (logStatus || false) {
    task.on('status', function (msg) {
      sails.log.debug("Status: " + msg)
    })
  }

  task.on('data', dataCb);

  setTimeout( function() { task.start() }, 100)
  return task
}

var indexSiteAPI = function(content) {
  var task = this,
    lines = content.split("\n"),
    added = 0,
    addAttempts = 0,
    contentLength = lines.length - 1,
    startTime = new Date().getTime()

  ++Indexer.indexerStats[task.url].responses
  Indexer.indexerStats[task.url].torrents += contentLength
  Indexer.indexerStats[task.url].interval = task.getInterval()

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
            if (CommandLineHelpers.config.live) {
              MetadataService.queue(entry.uuid)
            }
          }
          if (addAttempts >= contentLength) {
            Indexer.indexerStats[task.url].indexed += added
            sails.log.debug("[" + task.url + "] Indexed " + added + " out of " + (contentLength + 1) + " in " + ((new Date().getTime() - startTime)) + "ms (" + (task._totalNumLines || 0) + " lines so far)")
            addAttempts = 0
            added = 0
            task.resume()
          }
        })
      } else {
        --contentLength
      }
    }
  }
}

exports.getDownloadLink = function(hash, cache, source) {
  if (cache.length) {
    return 'http://' + cache + '/torrent/' + hash.toUpperCase() + '.torrent'
  } else {
    return ((source.indexOf('bitsnoop.com') == -1) ? 'http://torcache.net/torrent/' + hash.toUpperCase() + '.torrent' : 'http://torrage.com/torrent/' + hash.toUpperCase() + '.torrent')
  }
}