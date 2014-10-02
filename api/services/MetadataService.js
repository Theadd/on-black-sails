/**
 * Created by Theadd on 7/30/14.
 */

module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  var self = this

  self.config({
    'recentPoolMaxSize': 250,
    'poolMinSize': 10,
    'runInterval': 0,
    'appspace': 'onblacksails.',
    'id': 'metadata',
    'retry': CommandLineHelpers.config.metadata.retry,
    'silent': CommandLineHelpers.config.metadata.silent,
    'networkHost': CommandLineHelpers.config.metadata.host,
    'networkPort': CommandLineHelpers.config.metadata.port,
    'path': CommandLineHelpers.config.datapath,
    'onempty': CommandLineHelpers.config.metadata.onempty
  })

  self._isEmptyBusy = false

  self.on('process', function(item) {
    self._task.setStatus('targeting')

    Hash.find()
      .where({ uuid: item })
      .exec(function(err, entries) {
        if (!err && entries.length) {
          self._task.hash = entries[0].uuid
          self._task.title = entries[0].title
          self._task.category = entries[0].category
          self._task.role = 'update-metadata'
          self._task.use(Indexer.getDownloadLink(entries[0].uuid, entries[0].cache || '', entries[0].source))
        } else {
          console.log("Unexpected error in MetadataService.on('process')")
          self._task.setStatus('standby')
        }
      })
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

module.exports.start = function () {
  var self = this

  self._task = Indexer.createTask(
    function () { return self.run.apply(self, arguments) }
    , CommandLineHelpers.config.metadata.interval,
    function () { return self.updateMetadata.apply(self, arguments) },
    function () { return self.errorOnUpdateMetadata.apply(self, arguments) }
  )
}

module.exports.updateMetadata = function(content) {
  var self = this,
    task = self._task,
    dateAdded = content.created || (new Date())

  if (!self.isValidDate(dateAdded)) {
    dateAdded = new Date()
  }

  //Update Hash model
  Hash.update({ uuid: task.hash },{
    size: Number(content.length),
    trackers: content.announce,
    files: content.files.length,
    downloaded: true,
    added: dateAdded
  }, function(err, hashes) {
    ++self._stats['items-processed']
    if (err) {
      console.log(err)
    } else {
      if (hashes[0].category.indexOf("movies") != -1) {
        MediaService.queue(hashes[0].uuid)
      } else {
        StatusService.queue(hashes[0].uuid)
        TrackerService.queue(hashes[0].uuid)
      }
    }
  })
  //Update File model
  if (CommandLineHelpers.config.indexfiles) {
    for (var i in content.files) {
      var data = {};
      data['hash'] = task.hash
      data['file'] = content.files[i].name
      data['title'] = task.title
      data['category'] = task.category
      data['added'] = dateAdded
      data['size'] = content.files[i].size;
      File.create(data).exec(function (err, fileentry) {
        if (err) console.error(err)
      })
    }
  }
}

module.exports.errorOnUpdateMetadata = function(error) {
  var task = this._task

  Hash.update({ uuid: task.hash },{
    cache: ''
  }, function(err, hashes) {
    console.log("\n# Download error: " + task.url)
    console.log("\t" + error)
    if (err) {
      console.log("[In errorOnUpdateMetadata()]: ERROR UPDATING METADATA OF " + task.hash)
      console.log(err)
    }
  })
}

module.exports.isValidDate = function(d) {
  if ( Object.prototype.toString.call(d) !== "[object Date]" )
    return false
  if (!isNaN(d.getTime())) {
    return (d.getTime() <= (new Date().getTime()))
  } else return false
}