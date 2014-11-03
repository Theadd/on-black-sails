/**
 * Created by Theadd on 21/09/2014.
 */

var extend = require('node.extend');

exports.run = function (modelName, opts) {
  opts = opts || {}
  var modelObj = getModel(modelName, opts),
    model, options

  if (!modelObj) throw new Error("Unrecognized ServiceQueueModel: " + modelName)

  model = modelObj.model
  options = modelObj.options
  var interval = Number(options.interval)

  if (interval) {
    setInterval( function() {
      ServiceQueueModel.runOnce(modelName)
    }, interval)
  }

  ServiceQueueModel.runOnce(modelName)
}

exports.runOnce = function (modelName, opts, cb) {
  var modelObj = getModel(modelName, opts),
    model, options

  cb = cb || function () {}

  if (!modelObj) return cb(new Error("Unrecognized ServiceQueueModel: " + modelName), null)

  model = modelObj.model
  options = modelObj.options

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
            cb(null, entries.length, extend(true, {}, options))
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
}

var getModel = exports.getModel = function (modelName, opts) {
  var parts = modelName.split('-', 2),
    model = ServiceQueueModels[parts[0]] || false,
    options = {}

  if (!model) return false
  opts = opts || {}

  if (parts[1] && model.config[parts[1]]) {
    options = extend(true, extend(true, extend(true, {}, model.config.defaults), model.config[parts[1]]), opts)
  } else {
    options = extend(true, extend(true, {}, model.config.defaults), opts)
  }

  return {model: model, options: options}
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

exports.getListOfModels = function () {
  var list = {}

  for (var model in ServiceQueueModels) {
    if (['identity', 'globalId'].indexOf(model) != -1) continue
    var config = ServiceQueueModels[model].config
    var options = extend(true, {}, config.defaults)
    options.name = model
    list[options.name] = extend(true, {}, options)
    for (var i in config) {
      if (i == 'defaults') continue
      var subOptions = extend(true, extend(true, {}, options), config[i])
      subOptions.name = subOptions.name + '-' + i
      list[subOptions.name] = extend(true, {}, subOptions)
    }
  }

  return list
}
