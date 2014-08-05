/**
 * Created by Theadd on 5/30/14.
 */

var Task = require('tasker').Task

exports.run = function() {
  var os = require('os')
  sails.config['platform'] = os.platform()

  console.log(CommandLineHelpers.usage())
  CommandLineHelpers.process()

  TrackerService.setup()
  MetadataService.setup()
  StatusService.setup()
  MediaService.setup()

  setInterval( function() {
    console.log("\n\n\n")
    console.log(TrackerService.getStats())
    console.log(MetadataService.getStats())
    console.log(StatusService.getStats())
    console.log(MediaService.getStats())
  }, 10000)


  if (CommandLineHelpers.config.tracker.active) {
    TrackerService.server()
    TrackerService.run()
  }

  if (CommandLineHelpers.config.index.kickass.active) {
    if (CommandLineHelpers.config.index.kickass.full) {
      createTask('http://kickass.to/dailydump.txt.gz', 0, indexSiteAPI)
    } else {
      createTask('http://kickass.to/hourlydump.txt.gz', 1800000, indexSiteAPI) //30min = 1800000
    }
  }

  if (CommandLineHelpers.config.index.bitsnoop.active) {
    if (CommandLineHelpers.config.index.bitsnoop.full) {
      createTask('http://ext.bitsnoop.com/export/b3_all.txt.gz', 0, indexSiteAPI)
    } else {
      createTask('http://bitsnoop.com/api/latest_tz.php?t=all', 600000, indexSiteAPI) //10min = 600000
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
      console.log(task.url)
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
            console.log("[" + task.url + "] Indexed " + added + " out of " + (contentLength + 1) + " in " + ((new Date().getTime() - startTime)) + "ms (" + (task._totalNumLines || 0) + " lines so far)")
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