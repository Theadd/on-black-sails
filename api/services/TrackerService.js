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
    'networkPort': CommandLineHelpers.config.tracker.port
  })

  this.totalResponses = 0
  this.announce = []
  var self = this


  this.on('process', function(item) {
    self.updatePeersOf(item)
  })
}

module.exports.getProperAnnounceUrls = function (trackers) {
  var announceUrls = [],
    properFound = false

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
        announceUrls.push(tracker_i)
      }
    }
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
  ++this._stats['items-processed']
}

function ignore(err) {
  //console.log("ERROR: " + err.message)
}

module.exports.updatePeersOf = function(hash) {
  var self = this

  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        var peerId = new Buffer('01234567890123456789'),
          port = 6881,
          data = { announce: self.getProperAnnounceUrls(entries[0].trackers), infoHash: entries[0].uuid }

        if (data.announce.length) {
          var client = new TrackerClient(peerId, port, data)
          client.on('error', ignore)
          client.once('update', function (res) {
            self.registerAnnounceResponse(res.announce)
            Hash.update({ uuid: entries[0].uuid }, {
              seeders: res.complete,
              leechers: res.incomplete,
              updatedAt: entries[0].updatedAt
            }, function(err, hashes) {
              ++self._stats['items-processed']
            })
          })
          client.update()
        } else {
          ++self._stats['items-processed']
        }
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