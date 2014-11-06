/**
 * Created by Theadd on 9/4/14.
 */

var requestify = require('requestify')
var extend = require('util')._extend

module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {

  this.config({
    'recentPoolMaxSize': 250,
    'runInterval': CommandLineHelpers.config.propagate.interval,
    'appspace': 'onblacksails.',
    'id': 'propagate',
    'retry': CommandLineHelpers.config.propagate.retry,
    'silent': CommandLineHelpers.config.propagate.silent,
    'networkHost': CommandLineHelpers.config.propagate.host,
    'networkPort': CommandLineHelpers.config.propagate.port,
    'path': CommandLineHelpers.config.datapath || Settings.get('datapath'),
    'onempty': CommandLineHelpers.config.propagate.onempty,
    'agreement': CommandLineHelpers.config.propagate.agreement
  })

  var self = this
  self._isBusy = false
  self._isWorking = false
  self._isFillingStack = false
  self._stack = []
  self._stats['force-idle'] = 0
  self._filterOptions = {}
  self._agreement = false
  self._allsources = false
  self._exclude = -1

  self.on('process', function(item) {
    if (self._stack.length) {
      ++self._stats['force-idle']
      self.queue(item, true, true)
    } else {
      while (self._stack.length < self._filterOptions.stacksize && self._active) {
        var another = self.next()
        if (another == null) break
        self._stack.push(another)
      }
    }

    if (self._stack.length && !self._isWorking && self._active) {
      sails.log.debug("We got " + self._stack.length + " items in the stack ready to propagate!")
      self._isWorking = true
      self.propagate(function (err, res) {
        if (err) sails.log.error(err)
        var info = {
          count: (err) ? 0 : self._stack.length,
          sent: (err) ? 0 : res || 0,
          error: (err) ? 1 : 0
        }
        AgreementHistory.store(self._agreement.id, self.config('onempty'), false, info)
        if (!err) {
          self._stack = []
        }
        self._isWorking = false
      })
    }
  })

  self.on('empty', function() {
    if (!self._isBusy) {
      self._isBusy = true
      self.updateFilterParams(self._filterOptions)
      ServiceQueueModel.runOnce(self.config('onempty'), self._filterOptions, function (err, count, options) {

        self._filterOptions = options
        self._isBusy = false
      })
    }
  })
}

module.exports.start = function () {
  var self = this

  var modelObj = ServiceQueueModel.getModel(CommandLineHelpers.config.propagate.onempty)

  if (!modelObj) throw new Error("Unrecognized ServiceQueueModel: " + CommandLineHelpers.config.propagate.onempty)

  self.config({
    'recentPoolMaxSize': modelObj.options.stacksize,
    'poolMinSize': modelObj.options.stacksize,
    'runInterval': modelObj.options.interval
  })

  Agreement.findOne({id: self.config('agreement')}).exec( function (err, agreement) {
    if (err) {
      return sails.log.error("ERROR IN PropagateService.start > Agreement.findOne: " + self.config('agreement'))
    }
    if (agreement) {
      self._agreement = agreement
      self._filterOptions = agreement.getParam(self.config('onempty')) || {}
      self._allsources = agreement.localnode.allsources
      self._exclude = agreement.remotenode.id

      if (agreement.status == 'accepted') {
        self.run()
      } else if (agreement.status == 'paused') {
        self.active(false)
        Entity.send('ready', false)
        self.run()
      }
    }
  })
}

module.exports.updateFilterParams = function (options, callback) {
  var self = this
  callback = callback || function () {}

  Agreement.findOne({id: self.config('agreement')}).exec( function (err, agreement) {
    if (err || !agreement) return callback(err || 'Unexpected error.')
    agreement.setParams(self.config('onempty'), options, callback)
  })
}

module.exports.propagate = function (callback) {
  var self = this,
    localnode = Settings.get('cluster')

  Hash.find({
    uuid : self._stack
  }).exec( function (err, entries) {
    if (err) {
      sails.log.error("Error in PropagateService.propagate > Hash.find().exec() callback!")
      sails.log.error(err)
      return callback(err)
    }
    if (entries && entries.length) {
      var data = []
      for (var i in entries) {
        if (self._allsources) {
          if (self._exclude != entries[i].updatedBy) {
            data.push(entries[i])
          }
        } else if (entries[i].updatedBy == localnode) {
          data.push(entries[i])
        }
      }
      if (data.length) {
        self._send(data, function (err) {
          if (err) return callback(err)
          return callback(null, data.length)
        })
      } else {
        callback(null, 0)
      }

    } else {
      sails.log.error("NO ENTRIES FOUND in PropagateService.propagate > Hash.find().exec() callback!")
      return callback(null, 0)
    }
  })
}

module.exports._send = function(data, callback) {
  var self = this,
    url = self._agreement.remotenode.url + "agreement/propagate"

  requestify.get(url, {
    params: {
      agreement: self._agreement.id,
      filter: self.config('onempty'),
      data: Common.Encode(data, self._agreement.hash)
    }
  }).then(function(response) {
    response.getBody()
    try {
      callback(null, JSON.parse(response.body))
    } catch (e) {
      callback(e, response.body)
    }
  }, function(error) {
    callback(error)
  })
}
