/**
 * Created by Theadd on 7/19/14.
 */

var ipc = require('node-ipc')

var localPool = [],
  isClientEnabled = false,
  statistics = {
    session: {
      movies: 0,
      status: 0,
      metadata: 0,
      files: 0,
      peers: 0
    },
    workers: {
      'update-metadata': 0,
      'update-status': 0,
      'update-media': [],
      'index-file': 0,
      'update-tracker': 0 },
    announce: [],
    'media-cache-stats': {}
  }

ipc.config.appspace = 'output.'
ipc.config.id = 'output'
ipc.config.retry = 2500
ipc.config.silent = true
ipc.config.networkHost = 'localhost'
ipc.config.networkPort = 7891

/**
 * Initialize IPC server
 */
exports.init = function () {
  console.log("Initializing output IPC server")
  ipc.serveNet('localhost', 7891,
    function () {
      ipc.server.on (
        'statistics',
        function (data, socket) {
          mergeStatistics(data)
        }
      )
    }
  )

  ipc.server.start()
  if (!Indexer.role['quiet']) setInterval( function() { console.log(statistics) }, 60000)
}

exports.add = function (item) {
  localPool.push(item)
  if (!isClientEnabled) {
    this.connect()
    return
  }
  if (ipc.of.output.connected || false) {
    while (localPool.length) {
      ipc.of.output.emit(
        'statistics',
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
    'output', 'localhost', 7891,
    function() {
      ipc.of.output.on(
        'connect',
        function() {
          console.log("Connected to output IPC server")
          ipc.of.output.connected = true

        }
      )
      ipc.of.output.on(
        'disconnect',
        function() {
          console.log('Not connected to output IPC server')
          ipc.of.output.connected = false
        }
      )
    }
  )
}

var mergeStatistics = function (values) {
  for (var s in values['session']) {
    statistics['session'][s] += values['session'][s]
  }

  for (var w in values['workers']) {
    if (w != 'update-media' && values['workers'][w] != 0) {
      statistics['workers'][w] = values['workers'][w]
    } else if (w == 'update-media' && values['workers'][w].length) {
      statistics['workers'][w] = JSON.parse(JSON.stringify(values['workers'][w]))
    }
  }

  if (Object.keys(values['announce']).length) {
    statistics['announce'] = JSON.parse(JSON.stringify(values['announce']))
  }

  if (typeof values['media-cache-stats']['hits'] !== "undefined") {
    statistics['media-cache-stats'] = JSON.parse(JSON.stringify(values['media-cache-stats']))
  }
}

exports.getStatistics = function () {
  return statistics
}