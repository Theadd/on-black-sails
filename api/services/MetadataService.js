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
    'path': CommandLineHelpers.config.datapath || Settings.get('datapath'),
    'onempty': CommandLineHelpers.config.metadata.onempty
  })

  self._isEmptyBusy = false
  self._stats['empty-busy'] = 0
  self._stats['empty-queue-model'] = 0
  self._stats['empty-queue-model-callback'] = 0
  self._stats['empty-queue-model-error'] = 0
  self._stats['empty-queue-model-success'] = 0
  self._stats['empty-queue-model-no-results'] = 0

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
          sails.log.debug("Unexpected error in MetadataService.on('process')")
          self._task.setStatus('standby')
        }
      })
  })

  self.on('empty', function() {
    if (!self._isEmptyBusy) {
      if (self.config('onempty') != false) {
        self._isEmptyBusy = true
        ++self._stats['empty-queue-model']
        ServiceQueueModel.runOnce(self.config('onempty'), {}, function (err, count) {
          self._isEmptyBusy = false
          ++self._stats['empty-queue-model-callback']
          if (err) {
            ++self._stats['empty-queue-model-error']
          } else {
            if (count && count > 0) {
              ++self._stats['empty-queue-model-success']
            } else {
              ++self._stats['empty-queue-model-no-results']
            }
          }

        })
      }
    } else {
      ++self._stats['empty-busy']
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
    title: String(content.name),
    size: Number(content.length),
    trackers: content.announce,
    files: content.files.length,
    downloaded: true,
    added: dateAdded
  }, function(err, hashes) {
    ++self._stats['items-processed']
    if (err) {
      sails.log.debug(err)
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
  if (Settings.get('indexfiles')) {
    for (var i in content.files) {
      var data = {};
      data['hash'] = task.hash
      data['file'] = content.files[i].name
      data['title'] = task.title
      data['category'] = task.category
      data['added'] = dateAdded
      data['size'] = content.files[i].size;
      File.create(data).exec(function (err, fileentry) {
        if (err) sails.log.error(err)
      })
    }
  }
}

module.exports.errorOnUpdateMetadata = function(error) {
  var task = this._task

  Hash.update({ uuid: task.hash },{
    cache: ''
  }, function(err, hashes) {
    sails.log.debug("\n# Download error: " + task.url)
    sails.log.debug("\t" + error)
    if (err) {
      sails.log.debug("[In errorOnUpdateMetadata()]: ERROR UPDATING METADATA OF " + task.hash)
      sails.log.debug(err)
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