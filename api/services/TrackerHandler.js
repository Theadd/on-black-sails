/**
 * Created by Theadd on 7/19/14.
 */

var TrackerClient = require('bittorrent-tracker')
var ipc = require('node-ipc')

var totalResponses = 0,
  rawAnnounceItem = {'requests': 0, 'responses': 0, 'timeouts': 0, 'last-request': new Date().getTime()/*, 'active': false*/},
  pool = [],
  localPool = [],
  recentPool = [],
  isClientEnabled = false,
  taskActive = true

var announce = []

exports.reconfig = function (ipc) {
  ipc.config.appspace = 'onblacksails.'
  ipc.config.id = 'tracker'
  ipc.config.retry = 5000
  ipc.config.silent = true
  ipc.config.networkHost = 'localhost'
  ipc.config.networkPort = 8010
}

/**
 * Initialize IPC server
 */
exports.init = function () {
  TrackerHandler.reconfig(ipc)
  console.log("Initializing tracker IPC server on platform " + sails.config['platform']);
  ((sails.config['platform'] == 'win32') ? ipc.serveNet(ipc.config.networkHost, ipc.config.networkPort, ipcServeCb) : ipc.serve(ipc.config.socketRoot + ipc.config.appspace + ipc.config.id, ipcServeCb))

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

exports.run = function (json) {
  if (!isClientEnabled) {
    this.connect()
  }
  if (ipc.of.tracker.connected || false) {
    ipc.of.tracker.emit(
      'run',
      json
    )
  }
}

/**
 * Connect client to IPC server
 */
exports.connect = function () {
  TrackerHandler.reconfig(ipc)
  isClientEnabled = true;
  (sails.config['platform'] == 'win32') ? ipc.connectToNet(ipc.config.id, ipc.config.networkHost, ipc.config.networkPort, ipcConnectCb) : ipc.connectTo(ipc.config.id, ipc.config.socketRoot + ipc.config.appspace + ipc.config.id, ipcConnectCb)
}

/** IPC Callbacks */

var ipcServeCb = function () {
  ipc.server.on (
    'hash',
    function (data, socket) {
      if (pool.indexOf(data) == -1 && recentPool.indexOf(data) == -1) {
        pool.push(data)
      }
    }
  )
  ipc.server.on (
    'run',
    function (data, socket) {
      if (data['action'] == 'log') {
        console.log(data['data'])
      } else if (data['action'] == 'pause') {
        taskActive = false
        console.log("Active: " + taskActive)
      } else if (data['action'] == 'resume') {
        taskActive = true
        console.log("Active: " + taskActive)
      } else if (data['action'] == 'refresh') {
        Indexer.sendStatistics()
      }
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

var start = exports.start = function () {
  if (taskActive && pool.length) {
    var hash = pool.shift()
    if (recentPool.push(hash) > 250) {
      recentPool.splice(0, 25)
    }
    updatePeersOf(hash)
  }

  setTimeout(start, 150)
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

var updatePeersOf = exports.updatePeersOf = function(hash) {

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
          client.once('update', function (res) {
            registerAnnounceResponse(res.announce)
            Hash.update({ uuid: entries[0].uuid }, {
              seeders: res.complete,
              leechers: res.incomplete,
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
  var returnValue = {}
  var keys = Object.keys(announce)
  for (key in keys) {
    returnValue[keys[key]] = announce[keys[key]]
  }
  return returnValue
}