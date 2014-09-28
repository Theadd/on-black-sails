/**
 * Created by Theadd on 7/26/14.
 */

var TrackerClient = require('bittorrent-tracker')
var rawAnnounceItem = {'requests': 0, 'responses': 0, 'timeouts': 0, 'last-request': new Date().getTime() }

module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  this.config({
    'recentPoolMaxSize': 250,
    'poolMinSize': -1,
    'runInterval': CommandLineHelpers.config.tracker.interval,
    'appspace': 'onblacksails.',
    'id': 'tracker',
    'retry': CommandLineHelpers.config.tracker.retry,
    'silent': CommandLineHelpers.config.tracker.silent,
    'networkHost': CommandLineHelpers.config.tracker.host,
    'networkPort': CommandLineHelpers.config.tracker.port,
    'path': CommandLineHelpers.config.datapath,
    'onempty': CommandLineHelpers.config.tracker.onempty
  })

  this.totalResponses = 0
  this.announce = []
  var self = this
  self._stats['urls-in-blacklist'] = 0
  self._stats['no-valid-announce'] = 0
  self._stats['items-updated'] = 0
  self._stats['items-update-error'] = 0
  self._stats['items-dead-removed'] = 0
  self._stats['items-not-found'] = 0
  self._stats['items-retry-fail'] = 0
  self._stats['working-pool-size'] = 0
  self._isEmptyBusy = false
  self._workingPool = []
  self._retriesPool = []

  self.on('process', function(item) {
    self.updatePeersOf(item)
  })

  self.on('empty', function() {
    if (!self._isEmptyBusy) {
      if (self.config('onempty') != false) {
        self._isEmptyBusy = true
        ServiceQueueModel.runOnce(self.config('onempty'), function () {
          self._isEmptyBusy = false
        })
      }
    }
  })
}

module.exports.getProperAnnounceUrls = function (trackers) {
  var announceUrls = [], self = this

  for (var i in trackers) {
    var tracker_i = trackers[i].toLowerCase()
    if (tracker_i.indexOf('dht://') == -1 && tracker_i.indexOf('https://') == -1) {
      if (!HashHelpers.isValidAnnounceURL(tracker_i)) {
        announceUrls.push(tracker_i)
      } else {
        ++self._stats['urls-in-blacklist']
      }
    }
  }

  if (announceUrls.length == 0) {
    ++self._stats['no-valid-announce']
  }

  return announceUrls
}

module.exports.updatePeersOf = function(hash) {
  var self = this

  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        ++self._stats['working-pool-size']
        var announceUrls = self.getProperAnnounceUrls(entries[0].trackers)
        new TorrentScraper(entries[0].uuid, announceUrls, null, function (err, res) {
          ++self._stats['items-processed']
          --self._stats['working-pool-size']
          if (!err) {
            console.log("  >>> " + entries[0].uuid + "\t" + res.complete + "/" + res.incomplete + " (" + res.downloaded + ") - " + res.retries + " #" + res.responses + "/" + res.announces)
            if (res.complete == 0 && res.incomplete == 0 && CommandLineHelpers.config.removedead) {
              HashHelpers.remove(entries[0].uuid)
              ++self._stats['items-dead-removed']
            } else {
              Hash.update({ uuid: entries[0].uuid }, {
                seeders: res.complete,
                leechers: res.incomplete,
                updatedAt: entries[0].updatedAt,
                peersUpdatedAt: new Date(),
                updatedBy: CommandLineHelpers.config.clusterid
              }, function (uErr, hashes) {
                if (!uErr) {
                  ++self._stats['items-updated']
                } else {
                  ++self._stats['items-update-error']
                  console.log("(TRACKER) UPDATE ERROR! " + entries[0].uuid)
                  console.log(uErr)
                }
              })
            }
          } else {
            console.log("\t\tERROR >>> " + entries[0].uuid + " > #" + announceUrls.length)
            console.log(announceUrls)
            ++self._stats['items-retry-fail']
          }

        })
      } else {
        ++self._stats['items-not-found']
        console.log("(TRACKER) Item not found! " + hash)
        console.log(err)
      }
    })
}

