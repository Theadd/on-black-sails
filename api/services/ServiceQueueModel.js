/**
 * Created by Theadd on 21/09/2014.
 */

var extend = require('util')._extend

exports.run = function (modelName) {
  var model = ServiceQueueModels[modelName] || false

  if (model) {
    var interval = Number(model.defaults.interval)

    if (interval) {
      setInterval( function() {
        ServiceQueueModel.runOnce(modelName)
      }, interval)
    }

    ServiceQueueModel.runOnce(modelName)

  } else {
    throw new Error("Unrecognized ServiceQueueModel: " + modelName)
  }
}

exports.runOnce = function (modelName, opts, cb) {
  var model = ServiceQueueModels[modelName] || false
  if (typeof opts === "function") {
    cb = opts
    opts = {}
  }
  cb = cb || false
  opts = opts || {}

  if (model) {
    var options = extend(extend({}, model.defaults || {}), opts)
    var targetName = options.target || false
    if (targetName) {
      var targetService = getTargetService(targetName)
      if (targetService) {
        model.getQuery(options).exec(function(err, entries) {
          if (!err && entries.length) {
            var i, skipRecentPool = options.skipRecentPool || false
            if (typeof model.filter === "function") {
              for (i in entries) {
                if (model.filter(entries[i], options)) {
                  targetService.queue(entries[i].uuid, options.prioritize || false, skipRecentPool)
                }
              }
            } else {
              for (i in entries) {
                targetService.queue(entries[i].uuid, options.prioritize || false, skipRecentPool)
              }
            }
            if (cb) {
              cb(null, entries.length, extend({}, options))
            }
          } else {
            if (cb) {
              cb(err || new Error('ServiceQueueModel: No entries found for ' + modelName), null)
            }
          }
        })
      }
    } else {
      if (cb) {
        cb(new Error("Undefined target service for ServiceQueueModel: " + modelName), null)
      }
    }
  } else {
    if (cb) {
      cb(new Error("Unrecognized ServiceQueueModel: " + modelName), null)
    }
  }
}

var getTargetService = exports.getTargetService = function (target) {
  var targetService = false

  switch (target) {
    case 'tracker':
      targetService = TrackerService
      break
    case 'metadata':
      targetService = MetadataService
      break
    case 'media':
      targetService = MediaService
      break
    case 'status':
      targetService = StatusService
      break
    case 'propagate':
      targetService = PropagateService
      break
    default:
      console.log("Unrecognized service: " + target)
      break
  }

  return targetService
}

