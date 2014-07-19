/**
 * Created by Theadd on 7/19/14.
 */

var TrackerClient = require('bittorrent-tracker')
var ipc = require('node-ipc')

var totalResponses = 0,
  rawAnnounceItem = {'requests': 0, 'responses': 0, 'timeouts': 0, 'last-request': new Date().getTime()/*, 'active': false*/},
  localPool = [],
  isClientEnabled = false

var announce = exports.announce = []

ipc.config.appspace = 'trackers.'
ipc.config.id = 'trackers'
ipc.config.retry = 1500
ipc.config.silent = true
ipc.config.networkHost = 'localhost'
ipc.config.networkPort = 8010

/**
 * Initialize IPC server
 */
exports.init = function () {
  console.log("Initializing IPC server")
  ipc.serveNet('localhost', 8010,
    function () {
      ipc.server.on (
        'hash',
        function (data, socket) {
          updateTrackersFromHash(data)
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
  if (ipc.of.trackers.connected || false) {
    while (localPool.length) {
      ipc.of.trackers.emit(
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
    'trackers', 'localhost', 8010,
    function(){
      ipc.of.trackers.on(
        'connect',
        function(){
          console.log("Connected to trackers IPC server")
          ipc.of.trackers.connected = true

        }
      )
      ipc.of.trackers.on(
        'disconnect',
        function(){
          console.log('Not connected to trackers IPC server')
          ipc.of.trackers.connected = false
        }
      )
    }
  )
}

var getProperAnnounceUrls = exports.getProperAnnounceUrls = function (trackers) {
  var announceUrls = [],
    properFound = false

  if (totalResponses > 100) {
    var candidate = null,
      candidateUrl = ''

    for (var i in trackers) {
      if (typeof announce[trackers[i]] !== "undefined") {
        var item = announce[trackers[i]]
        if (!item['active']) {
          if (candidate == null || candidate['last-request'] > item['last-request']) {
            candidate = item
            candidateUrl = trackers[i]
          }
        } else {
          //check for timeouts: 15s if there was  no previous timeout, 30s for second timeout, 45s for third, etc.
          if ((new Date().getTime()) - item['last-request'] > (15000 * (item['timeouts'] + 1))) {
            announce[trackers[i]]['timeouts']++
            announce[trackers[i]]['active'] = false
            announce[trackers[i]]['last-request'] = new Date().getTime()
            /*if (candidate == null || candidate['last-request'] > item['last-request']) {
              candidate = item
              candidateUrl = trackers[i]
            }*/
          }
        }
      }
    }
    if (candidate != null) {
      properFound = true
      announceUrls.push(candidateUrl)
      announce[candidateUrl]['active'] = true
      announce[candidateUrl]['requests']++
      announce[candidateUrl]['last-request'] = new Date().getTime()
    }
  }

  if (!properFound) {
    for (var i in trackers) {
      if (trackers[i].indexOf('dht://') == -1) {
        announceUrls.push(trackers[i])
      }
    }
  }

  return announceUrls
}

var registerAnnounceResponse = exports.registerAnnounceResponse = function (url) {
  var item = announce[url] || JSON.parse(JSON.stringify(rawAnnounceItem))
  item['active'] = false
  item['responses']++
  item['last-response'] = new Date().getTime()
  if (totalResponses <= 100) {
    item['requests'] = item['responses']
    item['last-request'] = item['last-response']
  }

  announce[url] = item
  ++totalResponses
  Indexer.session.peers++
}

function ignore(err) {
  //console.log("ERROR: " + err.message)
}

var updateTrackersFromHash = exports.updateTrackersFromHash = function(hash) {

  Indexer.workers['update-tracker']++
  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        var peerId = new Buffer('01234567890123456789'),
          port = 6881,
          data = { announce: getProperAnnounceUrls(entries[0].trackers), infoHash: entries[0].uuid }

        if (data.announce.length) {
          var client = new TrackerClient(peerId, port, data)
          client.on('error', ignore)
          client.once('update', function (data) {
            registerAnnounceResponse(data.announce)
            Hash.update({ uuid: entries[0].uuid }, {
              seeders: data.complete,
              leechers: data.incomplete,
              updatedAt: entries[0].updatedAt
            }, function(err, hashes) {
              Indexer.workers['update-tracker']--
            })
          })
          client.update()
        } else {
          Indexer.workers['update-tracker']--
        }
      }
    })
}