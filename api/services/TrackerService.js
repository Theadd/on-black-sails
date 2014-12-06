/**
 * Created by Theadd on 7/26/14.
 */

var TrackerClient = require('bittorrent-tracker-scrape')

module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  this.config({
    'recentPoolMaxSize': 2500,
    'poolMinSize': 10,
    'runInterval': CommandLineHelpers.config.tracker.interval,
    'appspace': 'onblacksails.',
    'id': 'tracker',
    'retry': CommandLineHelpers.config.tracker.retry,
    'silent': CommandLineHelpers.config.tracker.silent,
    'networkHost': CommandLineHelpers.config.tracker.host,
    'networkPort': CommandLineHelpers.config.tracker.port,
    'path': CommandLineHelpers.config.datapath || Settings.get('datapath'),
    'onempty': CommandLineHelpers.config.tracker.onempty
  })

  var self = this
  self._stats['urls-in-blacklist'] = 0
  self._stats['items-updated'] = 0
  self._stats['items-update-error'] = 0
  self._stats['items-dead-removed'] = 0
  self._stats['items-not-found'] = 0
  self._stats['items-retry-fail'] = 0
  self._stats['working-pool-size'] = 0
  self._stats['force-idle'] = 0
  self._stats['interval'] = CommandLineHelpers.config.tracker.interval
  self._stats['host'] = CommandLineHelpers.config.tracker.host
  self._stats['port'] = CommandLineHelpers.config.tracker.port
  self._isEmptyBusy = false
  self._workingPool = []
  self._retriesPool = []

  self.on('process', function(item) {
    if (self._stats['working-pool-size'] >= 5) {
      ++self._stats['force-idle']
      self.queue(item, true, true)
    } else {
      self.updatePeersOf(item)
    }
  })

  self.on('empty', function() {
    if (!self._isEmptyBusy) {
      if (self.config('onempty') != false) {
        self._isEmptyBusy = true
        ServiceQueueModel.runOnce(self.config('onempty'), {}, function () {
          self._isEmptyBusy = false
        })
      }
    }
  })
}

module.exports.updatePeersOf = function(hash) {
  var self = this

  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        ++self._stats['working-pool-size']

        new TrackerClient(hash, entries[0].trackers, {}, function (err, res) {
          ++self._stats['items-processed']
          --self._stats['working-pool-size']
          if (!err) {
            //sails.log.debug("  >>> " + entries[0].uuid + "\t" + res.complete + "/" + res.incomplete + " (" + res.downloaded + ") - " + res.retries + " #" + res.responses + "/" + res.announces)
            if (res.complete == 0 && res.incomplete == 0 && Settings.get('removedead')) {
              HashHelpers.remove(entries[0].uuid)
              ++self._stats['items-dead-removed']
            } else {
              Hash.update({ uuid: entries[0].uuid }, {
                seeders: res.complete,
                leechers: res.incomplete,
                updatedAt: entries[0].updatedAt,
                peersUpdatedAt: new Date(),
                updatedBy: Settings.get('cluster')
              }, function (uErr, hashes) {
                if (!uErr) {
                  ++self._stats['items-updated']
                } else {
                  ++self._stats['items-update-error']
                  sails.log.debug("(TRACKER) UPDATE ERROR! " + entries[0].uuid)
                  sails.log.debug(uErr)
                }
              })
            }
          } else {
            //sails.log.debug("\t\tERROR >>> " + entries[0].uuid)
            //sails.log.debug(client.getAnnounce())
            ++self._stats['items-retry-fail']
          }
        })
      } else {
        ++self._stats['items-not-found']
        sails.log.debug("(TRACKER) Item not found! " + hash)
        sails.log.debug(err)
      }
    })
}
