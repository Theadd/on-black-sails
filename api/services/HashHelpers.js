/**
 * Created by Theadd on 11/09/2014.
 */

var extend = require('util')._extend

var mergeJob = {}


/**
 *
 * NOTE: When received does not provide 'peersUpdatedAt' nor 'updatedAt' returns true assuming that it provides static
 *       data, like the metadata of a torrent file.
 *
 * @param existing
 * @param received
 * @returns {boolean} True if received was more recently updated than the existing one.
 */
var isMostUpdated = exports.isMostUpdated = function (existing, received) {
  var mostUpdated = false

  if (typeof existing.peersUpdatedAt !== "undefined") {
    if (typeof received.peersUpdatedAt !== "undefined") {
      mostUpdated = ((new Date(existing.peersUpdatedAt)) < (new Date(received.peersUpdatedAt)))
    } else {
      if (typeof received.updatedAt !== "undefined") {
        mostUpdated = ((new Date(existing.updatedAt)) < (new Date(received.updatedAt)))
      } else {
        mostUpdated = true
      }
    }
  } else {
    if (typeof received.peersUpdatedAt !== "undefined") {
      mostUpdated = true
    } else {
      if (typeof received.updatedAt !== "undefined") {
        mostUpdated = ((new Date(existing.updatedAt)) < (new Date(received.updatedAt)))
      } else {
        mostUpdated = true
      }
    }
  }

  return mostUpdated
}

var onMergeJobReady = exports.onMergeJobReady = function (jobName, callback) {

  if (mergeJob[jobName] && mergeJob[jobName].busy) {
    sails.log.debug("[BUSY] " + jobName)
    setTimeout(function () {
      onMergeJobReady(jobName, callback)
    }, 100)
  } else {
    sails.log.debug("\t" + jobName + " not busy")
    callback()
  }
}

exports.mergeAllJob = function (jobName, data, callback) {

  mergeJob[jobName] = {
    busy: true,
    remaining: data.length,
    result: {
      count: data.length,
      deadmarked: 0,
      error: 0,
      updated: 0,
      uptodate: 0,
      created: 0,
      deadnotcreated: 0
    }
  }

  for (var i in data) {
    HashHelpers.merge(data[i], function (err, response) {
      if (!err && response) {
        ++mergeJob[jobName]['result'][response]
      }

      if (--mergeJob[jobName].remaining == 0) {
        var obj = extend({}, mergeJob[jobName].result)
        mergeJob[jobName].busy = false
        return callback(null, obj)
      }
    })
  }

}

exports.merge = function (item, callback) {
  callback = callback || function () {}

  delete item._id
  delete item.id

  Hash.find()
    .where({ uuid: item.uuid })
    .exec(function (err, entries) {
      var deadParams = {}

      if (!err && entries.length) {
        if (isMostUpdated(entries[0], item)) {
          var uuid = item.uuid

          deadParams = HashHelpers.getDeadParameters(entries[0], item)

          if (HashHelpers.shouldBeRemoved(deadParams)) {
            HashHelpers.remove(uuid)
            return callback(null, 'removed')
          } else {
            item = extend(true, item, deadParams)
            delete item.uuid

            Hash.update({uuid: uuid}, item, function (err) {
              if (err) return callback(null, 'error')
              return callback(null, 'updated')
            })
          }
        } else {
          return callback(null, 'uptodate')
        }
      } else {
        deadParams = HashHelpers.getDeadParameters({}, item)

        if (HashHelpers.shouldBeRemoved(deadParams)) {
          return callback(null, 'deadnotcreated')
        } else {
          item = extend(true, item, deadParams)

          Hash.create(item).exec(function (err) {
            if (err) {
              sails.log.error(err)
              return callback(null, 'error')
            } else {
              return callback(null, 'created')
            }
          })
        }
      }
    })
}

exports.remove = function (uuid) {
  process.nextTick(function () {
    Hash.destroy({ uuid: uuid }).exec(function() {
      sails.log.warn(uuid + " removed.")
    })
  })
}

exports.getDeadParameters = function (current, updated, foundDead) {
  var params = {}

  current = current || {}
  updated = updated || {}
  foundDead = (typeof foundDead === "boolean") ? foundDead : null

  if (current.deaths || 0) {
    // current DEAD
    if (updated.deaths || 0) {
      // current DEAD, updated DEAD
      if (updated.deaths > current.deaths) {
        if ((new Date(updated.deadSince)) < (new Date(current.deadSince))) {
          params.deaths = updated.deaths
          params.deadSince = updated.deadSince
        } else {
          params.deaths = current.deaths + 1
        }
      } else {
        params.deaths = current.deaths + 1
      }
    } else {
      // current DEAD, updated ALIVE or UNDEFINED
      if (typeof updated.deaths !== "undefined") {
        // current DEAD, updated ALIVE
        if ((new Date(updated.peersUpdatedAt)) < (new Date(current.deadSince))) {
          params.deaths = 0
        }
      } else {
        // current DEAD, updated UNDEFINED
        if (foundDead == true) {
          params.deaths = current.deaths + 1
        } else if (foundDead == false) {
          params.deaths = 0
        }
      }
    }
  } else {
    // current ALIVE or UNDEFINED
    if (typeof current.deaths !== "undefined") {
      // current ALIVE
      if (updated.deaths || 0) {
        // current ALIVE, updated DEAD
        if ((new Date(updated.deadSince)) < (new Date(current.peersUpdatedAt))) {
          params.deaths = updated.deaths
          params.deadSince = updated.deadSince
        } else {
          // COMMENT: <updated> is wrong!
        }
      } else {
        // current ALIVE, updated ALIVE or UNDEFINED
        if (typeof updated.deaths !== "undefined") {
          // current ALIVE, updated ALIVE
        } else {
          // current ALIVE, updated UNDEFINED
          if (foundDead == true) {
            params.deaths = 1
            params.deadSince = new Date()
          }
        }
      }
    } else {
      // current UNDEFINED
      if (updated.deaths || 0) {
        // current UNDEFINED, updated DEAD
        params.deaths = updated.deaths
        params.deadSince = updated.deadSince
      } else {
        //current UNDEFINED, updated ALIVE or UNDEFINED
        if (typeof updated.deaths !== "undefined") {
          // current UNDEFINED, updated ALIVE
          params.deaths = 0
        } else {
          // current UNDEFINED, updated UNDEFINED
          if (foundDead == true) {
            params.deaths = 1
            params.deadSince = new Date()
          } else if (foundDead == false) {
            params.deaths = 0
          }
        }
      }
    }
  }

  return params
}

exports.shouldBeRemoved = function (deadParameters) {
  var remove = false

  if (Settings.get('removedead')) {
    if (deadParameters.deaths || 0) {
      if (deadParameters.deadSince || false) {
        if ((new Date().getTime()) - (new Date(deadParameters.deadSince).getTime()) >= Settings.get('timekeepingdead')) {
          remove = true
        }
      }
    }
  }

  return remove
}
















