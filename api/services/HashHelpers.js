/**
 * Created by Theadd on 11/09/2014.
 */

var extend = require('util')._extend

var deadTorrentsPool = []
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
      if (!err && entries.length) {
        if (isMostUpdated(entries[0], item)) {
          if (typeof item.seeders !== "undefined" && Settings.get('removedead') && item.seeders == 0 && item.leechers == 0) {
            //Remove dead torrent
            HashHelpers.remove(entries[0].uuid) //TODO: HashHelpers.getDeadParameters()
            return callback(null, 'deadmarked')
          } else {
            var uuid = item.uuid

            delete item.uuid

            Hash.update({ uuid: uuid }, item, function (err, hashes) {
              if (err) return callback(null, 'error')
              return callback(null, 'updated')
            })
          }
        } else {
          return callback(null, 'uptodate')
        }
      } else {
        if (!(typeof item.seeders !== "undefined" && Settings.get('removedead') && item.seeders == 0 && item.leechers == 0)) {
          Hash.create(item).exec(function (createErr, entry) {
            if (createErr) {
              sails.log.error(createErr)
              return callback(null, 'error')
            } else {
              return callback(null, 'created')
            }
          })
        } else {
          return callback(null, 'deadnotcreated')
        }
      }
    })
}

exports.remove = function (uuid) {
  process.nextTick(function () {
    Hash.find()
      .where({ uuid: uuid })
      .exec(function (err, entries) {
        if (!err && entries.length) {
          if (entries[0].seeders == 0 && entries[0].leechers == 0) {
            //torrent already dead, delete
            sails.log.debug("REMOVING: " + uuid)
            Hash.destroy({ uuid: uuid }).exec(function() {})
          } else {
            //torrent was not dead last check
            var index = deadTorrentsPool.indexOf(uuid)
            if (index == -1) {
              //seems dead for first time, recheck before remove
              if (deadTorrentsPool.unshift(uuid) >= 500) {
                deadTorrentsPool.splice(-50)
              }
              sails.log.debug("RECHECK BEFORE REMOVING: " + uuid)
              TrackerService.queue(uuid, true, true)
            } else {
              //recheck also returns dead, remove from dead pool and database
              sails.log.debug("REMOVING (After recheck): " + uuid)
              deadTorrentsPool.splice(index, 1)
              Hash.destroy({ uuid: uuid }).exec(function() {})
            }
          }
        } else {
          //torrent not found, no remove needed
        }
      })
  })
}

exports.getDeadParameters = function (current, updated, foundDead) {
  var params = {}

  current = current || {}
  updated = updated || {}
  foundDead = foundDead || null

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
















