/**
 * Created by Theadd on 7/19/14.
 */

var TrackerClient = require('bittorrent-tracker')
var ipc = require('node-ipc')

var totalResponses = 0,
  rawAnnounceItem = {'requests': 0, 'responses': 0, 'timeouts': 0, 'last-request': new Date().getTime()/*, 'active': false*/},
  localPool = [],
  isClientEnabled = false

var announce = []

ipc.config.appspace = 'onblacksails.'
ipc.config.id = 'tracker'
ipc.config.retry = 5000
ipc.config.silent = true
ipc.config.networkHost = 'localhost'
ipc.config.networkPort = 8010

/**
 * Initialize IPC server
 */
exports.init = function () {
  console.log("Initializing tracker IPC server on platform " + sails.config['platform']);
  ((sails.config['platform'] == 'win32') ? ipc.serveNet('localhost', 8010, ipcServeCb) : ipc.serve(ipcServeCb))

  ipc.server.start()
}

exports.add = function (hash) {
  localPool.push(hash)
  if (!isClientEnabled) {
    this.connect()
    return
  }
  if (ipc.of.tracker.connected || false) {
    while (localPool.length) {
      ipc.of.tracker.emit(
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
  isClientEnabled = true;
  (sails.config['platform'] == 'win32') ? ipc.connectToNet('tracker', 'localhost', 8010, ipcConnectCb) : ipc.connectTo('tracker', ipcConnectCb)
}

/** IPC Callbacks */

var ipcServeCb = function () {
  ipc.server.on (
    'hash',
    function (data, socket) {
      console.info("tracker - ipcServerCb on hash: " + data)
      updatetrackerFromHash(data)
    }
  )
}

var ipcConnectCb = function() {
  ipc.of.tracker.on(
    'connect',
    function(){
      console.log("Connected to tracker IPC server")
      ipc.of.tracker.connected = true

    }
  )
  ipc.of.tracker.on(
    'disconnect',
    function(){
      console.log('Not connected to tracker IPC server')
      ipc.of.tracker.connected = false
    }
  )
}

var getProperAnnounceUrls = exports.getProperAnnounceUrls = function (tracker) {
  var announceUrls = [],
    properFound = false

  if (totalResponses > 100) {
    var candidate = null,
      candidateUrl = ''

    for (var i in tracker) {
      if (typeof announce[tracker[i]] !== "undefined") {
        var item = announce[tracker[i]]
        if (!item['active']) {
          if (candidate == null || candidate['last-request'] > item['last-request']) {
            candidate = item
            candidateUrl = tracker[i]
          }
        } else {
          //check for timeouts: 15s if there was  no previous timeout, 30s for second timeout, 45s for third, etc.
          if ((new Date().getTime()) - item['last-request'] > (15000 * (item['timeouts'] + 1))) {
            announce[tracker[i]]['timeouts']++
            announce[tracker[i]]['active'] = false
            announce[tracker[i]]['last-request'] = new Date().getTime()
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
    for (var i in tracker) {
      if (tracker[i].indexOf('dht://') == -1) {
        announceUrls.push(tracker[i])
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

var updatetrackerFromHash = exports.updatetrackerFromHash = function(hash) {

  Indexer.workers['update-tracker']++
  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        var peerId = new Buffer('01234567890123456789'),
          port = 6881,
          data = { announce: getProperAnnounceUrls(entries[0].tracker), infoHash: entries[0].uuid }

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

exports.getAnnounce = function() {
  return announce
}