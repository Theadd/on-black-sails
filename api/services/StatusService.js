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
    'retry': CommandLineHelpers.config.status.retry,
    'silent': CommandLineHelpers.config.status.silent,
    'networkHost': CommandLineHelpers.config.status.host,
    'networkPort': CommandLineHelpers.config.status.port,
    'path': CommandLineHelpers.config.datapath || Settings.get('datapath'),
    'onempty': CommandLineHelpers.config.status.onempty
  })

  self._isEmptyBusy = false
  self._stats['host'] = CommandLineHelpers.config.status.host
  self._stats['port'] = CommandLineHelpers.config.status.port

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
          sails.log.debug("Unexpected error in StatusService.on('process')")
          self._task.setStatus('standby')
        }
      })
  })

  self.on('empty', function() {
    if (!self._isEmptyBusy) {
      if (self.config('onempty') != false) {
        self._isEmptyBusy = true
        ServiceQueueModel.runOnce(self.config('onempty'), {}, function () {
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
    , CommandLineHelpers.config.status.interval,
    function () { return self.updateStatus.apply(self, arguments) }
  )

  self._stats['interval'] = CommandLineHelpers.config.status.interval
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
