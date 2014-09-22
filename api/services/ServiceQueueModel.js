/**
 * Created by Theadd on 21/09/2014.
 */

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

exports.runOnce = function (modelName, cb) {
  var model = ServiceQueueModels[modelName] || false
  cb = cb || false

  if (model) {
    var targetName = model.defaults.target || false
    if (targetName) {
      var targetService = getTargetService(targetName)
      if (targetService) {
        model.getQuery(model.defaults).exec(function(err, entries) {
          if (!err && entries.length) {
            for (var i in entries) {
              targetService.queue(entries[i].uuid)
            }
            if (cb) {
              cb(null, entries.length)
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

var getTargetService = function (target) {
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
    default:
      console.log("Unrecognized service: " + target)
      break
  }

  return targetService
}

