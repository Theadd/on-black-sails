/**
 * Created by Theadd on 7/19/14.
 */

var ipc = require('node-ipc')

var pool = [],
  localPool = [],
  isClientEnabled = false,
  status2value = { 'VERIFIED': 2, 'GOOD': 1, 'NONE': 0, 'ERROR': 0, 'NOTFOUND': 0, 'BAD': -1, 'FAKE': -2 }

exports.reconfig = function (ipc) {
  ipc.config.appspace = 'onblacksails.'
  ipc.config.id = 'status'
  ipc.config.retry = 5000
  ipc.config.silent = true
  ipc.config.networkHost = 'localhost'
  ipc.config.networkPort = 8015
}

/**
 * Initialize IPC server
 */
exports.init = function () {
  StatusHandler.reconfig(ipc)
  console.log("Initializing status IPC server on platform " + sails.config['platform']);
  ((sails.config['platform'] == 'win32') ? ipc.serveNet(ipc.config.networkHost, ipc.config.networkPort, ipcServeCb) : ipc.serve(ipc.config.socketRoot + ipc.config.appspace + ipc.config.id, ipcServeCb))

  ipc.server.start()
}

exports.add = function (hash) {
  localPool.push(hash)
  if (!isClientEnabled) {
    this.connect()
    return
  }
  if (ipc.of.status.connected || false) {
    while (localPool.length) {
      ipc.of.status.emit(
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
  StatusHandler.reconfig(ipc)
  isClientEnabled = true;
  (sails.config['platform'] == 'win32') ? ipc.connectToNet(ipc.config.id, ipc.config.networkHost, ipc.config.networkPort, ipcConnectCb) : ipc.connectTo(ipc.config.id, ipc.config.socketRoot + ipc.config.appspace + ipc.config.id, ipcConnectCb)
}

/** IPC Callbacks */

var ipcServeCb = function () {
  ipc.server.on (
    'hash',
    function (data, socket) {
      if (pool.indexOf(data) == -1) {
        pool.push(data)
      }
    }
  )
}

var ipcConnectCb = function() {
  ipc.of.status.on(
    'connect',
    function(){
      console.log("Connected to status IPC server")
      ipc.of.status.connected = true

    }
  )
  ipc.of.status.on(
    'disconnect',
    function(){
      console.log('Not connected to status IPC server')
      ipc.of.status.connected = false
    }
  )
}

exports.start = function () {
  Indexer.createTask(function () {
    var task = this
    task.setStatus('targeting')
    if (pool.length) {
      var hash = pool.pop()
      Hash.find()
        .where({ uuid: hash })
        .exec(function(err, entries) {
          if (!err && entries.length) {
            task.hash = entries[0].uuid
            task.title = entries[0].title
            task.role = 'update-status'
            task.addToTrackerHandler = false
            Indexer.workers[task.role]++
            task.use('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].uuid)
          }
        })
    } else {
      Hash.find()
        .where({ downloaded: true })
        .sort('updatedAt ASC')
        .where({category: { not: ["movies", "video movies"] } })
        .limit(1)
        .exec(function(err, entries) {
          if (!err && entries.length) {
            task.hash = entries[0].uuid
            task.title = entries[0].title
            task.role = 'update-status'
            task.addToTrackerHandler = true
            Indexer.workers[task.role]++
            task.use('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].uuid)
          }
        })
    }
  }, Indexer.role['update-status-interval'], updateStatus)
}


var updateStatus = function(content) {
  var task = this,
    value = status2value[content]

  Indexer.workers[task.role]--

  if (value > -10 && value < 10) {
    Hash.update({ uuid: task.hash },{ status: value }, function(err, hashes) { });
    Indexer.session.status++
    if (task.addToTrackerHandler) {
      TrackerHandler.add(task.hash)
    }
  }
}
