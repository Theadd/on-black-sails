/**
 * Created by Theadd on 7/19/14.
 */

var ipc = require('node-ipc')

var pool = [],
  localPool = [],
  isClientEnabled = false

ipc.config.appspace = 'onblacksails.'
ipc.config.id = 'metadata'
ipc.config.retry = 5000
ipc.config.silent = true
ipc.config.networkHost = 'localhost'
ipc.config.networkPort = 8018

/**
 * Initialize IPC server
 */
exports.init = function () {
  console.log("Initializing metadata IPC server on platform " + sails.config['platform']);
  ((sails.config['platform'] == 'win32') ? ipc.serveNet('localhost', 8018, ipcServeCb) : ipc.serve(ipcServeCb))

  ipc.server.start()
}

exports.add = function (hash) {
  localPool.push(hash)
  if (!isClientEnabled) {
    this.connect()
    return
  }
  if (ipc.of.metadata.connected || false) {
    while (localPool.length) {
      ipc.of.metadata.emit(
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
  (sails.config['platform'] == 'win32') ? ipc.connectToNet('metadata', 'localhost', 8018, ipcConnectCb) : ipc.connectTo('metadata', ipcConnectCb)
}

/** IPC Callbacks */

var ipcServeCb = function () {
  ipc.server.on (
    'hash',
    function (data, socket) {
      //console.log("\tipc.metadata on hash: " + data)
      if (pool.indexOf(data) == -1) {
        pool.push(data)
      }
    }
  )
}

var ipcConnectCb = function() {
  ipc.of.metadata.on(
    'connect',
    function(){
      console.log("Connected to metadata IPC server")
      ipc.of.metadata.connected = true
    }
  )
  ipc.of.metadata.on(
    'disconnect',
    function(){
      console.log('Not connected to metadata IPC server')
      ipc.of.metadata.connected = false
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
            task.category = entries[0].category
            task.role = 'update-metadata'
            Indexer.workers[task.role]++
            task.use(Indexer.getDownloadLink(entries[0].uuid, entries[0].cache || '', entries[0].source))
          } else {
            task.setStatus('standby')
          }
        })
    } else {
      Hash.find()
        .where({ downloaded: false })
        .sort('updatedAt ASC')
        .limit(1)
        .exec(function(err, entries) {
          if (!err && entries.length) {
            task.hash = entries[0].uuid
            task.title = entries[0].title
            task.category = entries[0].category
            task.role = 'update-metadata'
            Indexer.workers[task.role]++
            task.use(Indexer.getDownloadLink(entries[0].uuid, entries[0].cache || '', entries[0].source))
          } else {
            return new Error("Unexpected error in MetadataManager.start()")
          }
        })
    }
  }, Indexer.role['update-metadata-interval'], updateMetadata, errorOnUpdateMetadata)
}

var updateMetadata = exports.updateMetadata = function(content) {
  var task = this
  Indexer.workers[task.role]--
  //Update Hash model
  Hash.update({ uuid: task.hash },{
    size: content.size,
    trackers: content.trackers,
    files: content.files.length,
    downloaded: true,
    added: new Date(content.creationDate)
  }, function(err, hashes) {
    if (err) {
      console.log("ERROR UPDATING METADATA OF " + task.hash)
      console.log(err)
    } else {
      Indexer.session.metadata++
      if (Indexer.role['live']) {
        if (hashes[0].category.indexOf("movies") != -1) {
          MediaManager.add(hashes[0].uuid)
        } else {
          StatusManager.add(hashes[0].uuid)
          TrackerHandler.add(hashes[0].uuid)
        }

      }
    }
  })
  //Update File model
  for (var i in content.files) {
    Indexer.workers['index-file']++
    var data = {};
    data['hash'] = task.hash
    data['file'] = content.files[i].name
    data['title'] = task.title
    data['category'] = task.category
    data['added'] = new Date(content.creationDate)
    data['size'] = content.files[i].size;
    File.create(data).exec(function(err, fileentry) {
      Indexer.workers['index-file']--
      if (!err) {
        Indexer.session.files++
      } else {
        console.log("!ERROR in file.create()")
        console.log(err)
      }
    })
  }
}

var errorOnUpdateMetadata = exports.errorOnUpdateMetadata = function(error) {
  var task = this
  Indexer.workers[task.role]--

  Hash.update({ uuid: task.hash },{
    cache: ''
  }, function(err, hashes) {
    console.log("\n# Download error: " + task.url)
    console.log("\t" + error)
    if (err) {
      console.log("[In errorOnUpdateMetadata()]: ERROR UPDATING METADATA OF " + task.hash)
      console.log(err)
    } else {
      Indexer.session.metadata++
    }
  })
}