/**
 * Created by Theadd on 7/31/14.
 */

module.exports = new (require('ipc-service').Service)()
var status2value = { 'VERIFIED': 2, 'GOOD': 1, 'NONE': 0, 'ERROR': 0, 'NOTFOUND': 0, 'BAD': -1, 'FAKE': -2 }

module.exports.setup = function() {
  var self = this

  self.config({
    'recentPoolMaxSize': 250,
    'poolMinSize': 10,
    'runInterval': 0,
    'appspace': 'onblacksails.',
    'id': 'status',
    'retry': 5000,
    'silent': true,
    'networkHost': 'localhost',
    'networkPort': 8015
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
          self._task.role = 'update-status'
          self._task.use('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].uuid)
        } else {
          console.log("Unexpected error in StatusService.on('process')")
          self._task.setStatus('standby')
        }
      })
  })

  self.on('empty', function() {
    if (!self._isEmptyBusy) {
      self._isEmptyBusy = true
      Hash.find()
        .where({ downloaded: true })
        .sort('updatedAt ASC')
        .where({category: { not: ["movies", "video movies"] } })
        .limit(60)
        .exec(function(err, entries) {
          if (!err && entries.length) {
            for (var i in entries) {
              self.queue(entries[i].uuid)
              TrackerService.queue(entries[i].uuid)
            }
            self._isEmptyBusy = false
          } else {
            console.log("Unexpected error in StatusService.on('empty')")
            self._isEmptyBusy = false
          }
        })
    }
  })
}

module.exports.start = function () {
  var self = this

  self._task = Indexer.createTask(
    function () { return self.run.apply(self, arguments) }
    , Indexer.role['update-status-interval'],
    function () { return self.updateStatus.apply(self, arguments) }
  )
}

module.exports.updateStatus = function(content) {
  var self = this,
    value = status2value[content]

  if (value > -10 && value < 10) {
    Hash.update({ uuid: self._task.hash },{ status: value }, function(err, hashes) { ++self._stats['items-processed'] })
  } else {
    ++self._stats['items-processed']
  }
}
