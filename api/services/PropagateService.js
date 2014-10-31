/**
 * Created by Theadd on 9/4/14.
 */

var requestify = require('requestify')
var extend = require('util')._extend

module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  var modelObj = ServiceQueueModel.getModel(CommandLineHelpers.config.propagate.onempty)

  if (!modelObj) throw new Error("Unrecognized ServiceQueueModel: " + CommandLineHelpers.config.propagate.onempty)

  this.config({
    'recentPoolMaxSize': modelObj.options.stacksize,
    'poolMinSize': modelObj.options.stacksize,
    'runInterval': modelObj.options.interval,
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

  self.on('process', function(item) {
    console.log("IN: self.on('process', function(item)... POOL SIZE: " + (self._pool.length + 1))
    if (self._stack.length) {
      ++self._stats['force-idle']
      self.queue(item, true, true)
    } else {
      while (self._stack.length < 20) {
        var another = self.next()
        if (another == null) break
        self._stack.push(another)
      }
    }

    if (self._stack.length && !self._isWorking) {
      console.log("We got " + self._stack.length + " items in the stack ready to propagate!")
      self._isWorking = true
      self.propagate(function (err, res) {
        console.log("in callback of propagate")
        console.error(err)
        console.log(res)
        if (!err) {
          console.log("\t\tPropagated.")
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
      console.log("Running: ServiceQueueModel.runOnce('" + self.config('onempty') + "', " + JSON.stringify(self._filterOptions, null, '  ') + ", ...)")
      ServiceQueueModel.runOnce(self.config('onempty'), self._filterOptions, function (err, count, options) {
        console.log("\tIn callback of peersAgreementFilter, err: " + err + ", count: " + count)
        console.log("\t... Options:\n")
        console.log(options)
        console.log("\t==================\n")

        self._filterOptions = options

        self._isBusy = false
      })
    }
  })
}

module.exports.start = function () {
  var self = this

  Agreement.findOne({id: self.config('agreement')}).exec( function (err, agreement) {
    if (err) {
      console.error("ERROR IN PropagateService.start > Agreement.findOne: " + self.config('agreement'))
      return console.error(err)
    }
    if (agreement) {
      console.log("IN .start, agreement found!")
      console.log(agreement)
      self._agreement = agreement
      self._filterOptions = agreement.getParam(self.config('onempty')) || {}

      if (agreement.status == 'accepted') {
        console.log("\nstatus accepted, run!")
        self.run()
      }
    }


  })
}

module.exports.updateFilterParams = function (options, callback) {
  var self = this
  callback = callback || function () {}

  console.log("updateFilterParams: ")
  console.log(options)
  console.log(" ")
  Agreement.findOne({id: self.config('agreement')}).exec( function (err, agreement) {
    if (err || !agreement) return callback(err || 'Unexpected error.')
    agreement.setParams(self.config('onempty'), options, callback)
  })
}

module.exports.propagate = function (callback) {
  var self = this

  Hash.find({
    uuid : self._stack
  }).exec( function (err, entries) {
    if (err) {
      console.error("Error in PropagateService.propagate > Hash.find().exec() callback!")
      console.error(err)
      return callback(err)
    }
    if (entries && entries.length) {
      var data = []
      for (var i in entries) {
        data.push(entries[i])
      }
      console.log("sending data...")
      self._send(data, callback)
    } else {
      console.error("NO ENTRIES FOUND in PropagateService.propagate > Hash.find().exec() callback!")
      return callback(null, true)
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
