/**
 * Created by Theadd on 7/19/14.
 */

var ipc = require('node-ipc')

var pool = [],
  localPool = []

ipc.config.id = 'metadata'
ipc.config.retry = 1500
ipc.config.silent = true

/**
 * Initialize IPC server
 */
exports.init = function () {
  console.log("Initializing IPC server")
  ipc.serveNet (
    function () {
      ipc.server.on (
        'hash',
        function (data, socket) {
          pool.push(data)
        }
      )
    }
  )

  ipc.server.start()
}

exports.add = function (hash) {
  localPool.push(hash)
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
  ipc.connectToNet(
    'metadata',
    function(){
      ipc.of.metadata.on(
        'connect',
        function(){
          console.log("connected to ipc server")
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
  //Probably, download link unavailable
  var task = this
  Indexer.workers[task.role]--

  Hash.update({ uuid: task.hash },{
    cache: ''
  }, function(err, hashes) {
    console.log("\n# Probably, download link unavailable for " + task.hash)
    console.log("\t" + task.url)
    console.log("\t" + error)
    if (err) {
      console.log("[In errorOnUpdateMetadata()]: ERROR UPDATING METADATA OF " + task.hash)
      console.log(err)
    } else {
      Indexer.session.metadata++
    }
  })
}