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
  self._stats['items-found'] = 0
  self._stats['items-received'] = 0
  self._stats['items-retry'] = 0
  self._stats['items-retry-fail'] = 0
  self._stats['working-pool-size'] = 0
  self._stats['items-dead-retry'] = 0
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
  var announceUrls = [],
    properFound = false,
    self = this

  if (this.totalResponses > 100) {
    var candidate = null,
      candidateUrl = ''

    for (var i in trackers) {
      if (typeof this.announce[trackers[i]] !== "undefined") {
        var item = this.announce[trackers[i]]
        if (!item['active']) {
          if (candidate == null || candidate['last-request'] > item['last-request']) {
            candidate = item
            candidateUrl = trackers[i]
          }
        } else {
          //check for timeouts: 15s if there was  no previous timeout, 30s for second timeout, 45s for third, etc.
          if ((new Date().getTime()) - item['last-request'] > (15000 * (item['timeouts'] + 1))) {
            this.announce[trackers[i]]['timeouts']++
            this.announce[trackers[i]]['active'] = false
            this.announce[trackers[i]]['last-request'] = new Date().getTime()
          }
        }
      }
    }
    if (candidate != null) {
      properFound = true
      announceUrls.push(candidateUrl)
      this.announce[candidateUrl]['active'] = true
      this.announce[candidateUrl]['requests']++
      this.announce[candidateUrl]['last-request'] = new Date().getTime()
    }
  }

  if (!properFound) {
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
  }

  if (announceUrls.length == 0) {
    ++self._stats['no-valid-announce']
  }

  return announceUrls
}

module.exports.registerAnnounceResponse = function (url) {
  var item = this.announce[url] || JSON.parse(JSON.stringify(rawAnnounceItem))
  item['active'] = false
  item['responses']++
  item['last-response'] = new Date().getTime()
  if (this.totalResponses <= 100) {
    item['requests'] = item['responses']
    item['last-request'] = item['last-response']
  }

  this.announce[url] = item
  ++this.totalResponses
}

function ignore(err) {
  //console.log("ERROR: " + err.message)
}

module.exports.updatePeersOf = function(hash) {
  var self = this

  ++self._stats['items-received']

  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        ++self._stats['items-found']
        var peerId = new Buffer('01234567890123456789'),
          port = 6881,
          data = { announce: self.getProperAnnounceUrls(entries[0].trackers), infoHash: entries[0].uuid }

        if (data.announce.length) {
          self._addToWorkingPool(entries[0].uuid)
          var client = new TrackerClient(peerId, port, data)
          client.on('error', ignore)
          client.once('update', function (res) {
            ++self._stats['items-processed']
            self._removeFromWorkingPool(entries[0].uuid)
            self.registerAnnounceResponse(res.announce)
            if (res.complete == 0 && CommandLineHelpers.config.removedead) {
              //Remove dead torrent
              if (self._processRetryAttempt(entries[0].uuid)) {
                ++self._stats['items-dead-retry']
                self.queue(entries[0].uuid, true, true)
              } else {
                HashHelpers.remove(entries[0].uuid)
                ++self._stats['items-dead-removed']
              }
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
            client.stop()
            client = null
          })
          client.update()
        }
      } else {
        ++self._stats['items-not-found']
        console.log("(TRACKER) Item not found! " + hash)
        console.log(err)
      }
    })
}

module.exports.getAnnounce = function() {
  var returnValue = {}
  var keys = Object.keys(this.announce)
  for (key in keys) {
    returnValue[keys[key]] = this.announce[keys[key]]
  }
  return returnValue
}

module.exports._addToWorkingPool = function(uuid) {
  var self = this, index = self._workingPool.indexOf(uuid)

  if (index == -1) {
    self._workingPool.unshift(uuid)
    if (self._workingPool.length > 20) {
      var retry = self._workingPool.splice(-10)
      for (var i in retry) {
        if (self._processRetryAttempt(retry[i])) {
          ++self._stats['items-retry']
          self.queue(retry[i], false, true)
        } else {
          ++self._stats['items-retry-fail']
        }
      }
    }
    self._stats['working-pool-size'] = self._workingPool.length
  }
}

module.exports._removeFromWorkingPool = function(uuid) {
  var self = this, index = self._workingPool.indexOf(uuid)

  if (index > -1) {
    self._workingPool.splice(index, 1)
    self._stats['working-pool-size'] = self._workingPool.length
  }
}

module.exports._processRetryAttempt = function(uuid) {
  var self = this, index = self._retriesPool.indexOf(uuid), valid = true

  if (index > -1) {
    self._retriesPool.splice(index, 1)
    valid = false
  } else {
    if (self._retriesPool.unshift(uuid) >= 120) {
      self._retriesPool.splice(-40)
    }
  }

  return valid
}