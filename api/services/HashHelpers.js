/**
 * Created by Theadd on 11/09/2014.
 */

var extend = require('util')._extend

var deadTorrentsPool = []
var mergeJob = {}

var isMostUpdated = exports.isMostUpdated = function (existing, received) {
  var mostUpdated = false

  if (typeof existing.peersUpdatedAt !== "undefined") {
    if (typeof received.peersUpdatedAt !== "undefined") {
      mostUpdated = ((new Date(existing.peersUpdatedAt)) < (new Date(received.peersUpdatedAt)))
    }
  } else {
    if (typeof received.peersUpdatedAt !== "undefined") {
      mostUpdated = true
    } else {
      mostUpdated = ((new Date(existing.updatedAt)) < (new Date(received.updatedAt)))
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

  Hash.find()
    .where({ uuid: item.uuid })
    .exec(function (err, entries) {
      if (!err && entries.length) {
        if (isMostUpdated(entries[0], item)) {
          if (Settings.get('removedead') && item.seeders == 0 && item.leechers == 0) {
            //Remove dead torrent
            HashHelpers.remove(entries[0].uuid)
            return callback(null, 'deadmarked')
          } else {
            var recentUpdatedAt = (entries[0].updatedAt < item.updatedAt),
              rateMatch = (entries[0].rate == item.rate)

            Hash.update({ uuid: item.uuid }, {
              seeders: item.seeders,
              leechers: item.leechers,
              updatedAt: (recentUpdatedAt) ? item.updatedAt : entries[0].updatedAt,
              peersUpdatedAt: item.peersUpdatedAt,
              updatedBy: item.updatedBy,
              rate: (!rateMatch && recentUpdatedAt) ? item.rate : entries[0].rate,
              media: (!rateMatch && recentUpdatedAt) ? item.media : entries[0].media
            }, function (err, hashes) {
              //updated
              if (err) return callback(null, 'error')
              return callback(null, 'updated')
            })
          }
        } else {
          return callback(null, 'uptodate')
        }
      } else {
        if (!(Settings.get('removedead') && item.seeders == 0 && item.leechers == 0)) {
          delete item._id
          delete item.id
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
            console.log("REMOVING: " + uuid)
            Hash.destroy({ uuid: uuid }).exec(function() {})
          } else {
            //torrent was not dead last check
            var index = deadTorrentsPool.indexOf(uuid)
            if (index == -1) {
              //seems dead for first time, recheck before remove
              if (deadTorrentsPool.unshift(uuid) >= 500) {
                deadTorrentsPool.splice(-50)
              }
              console.log("RECHECK BEFORE REMOVING: " + uuid)
              TrackerService.queue(uuid, true, true)
            } else {
              //recheck also returns dead, remove from dead pool and database
              console.log("REMOVING (After recheck): " + uuid)
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
