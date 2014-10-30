/**
 * Created by Theadd on 9/4/14.
 */

var requestify = require('requestify')
var extend = require('util')._extend
module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  this.config({
    'recentPoolMaxSize': 20,  //250,
    /*'poolMinSize': -1,*/'poolMinSize': 30,
    'runInterval': 3000, //30s //CommandLineHelpers.config.propagate.interval,
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

  //TODO: propagate
  callback(null, true)
}

