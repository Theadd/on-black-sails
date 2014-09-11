/**
 * Created by Theadd on 11/09/2014.
 */

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

exports.merge = function (item) {
  Hash.find()
    .where({ uuid: item.uuid })
    .exec(function (err, entries) {
      if (!err && entries.length) {
        if (isMostUpdated(entries[0], item)) {
          if (CommandLineHelpers.config.removedead && item.seeders == 0) {
            //Remove dead torrent
            HashHelpers.remove(entries[0].uuid)
          } else {
            var recentUpdatedAt = (entries[0].updatedAt < item.updatedAt),
              rateMatch = (entries[0].rate == item.rate)

            console.log("\t" + item.uuid + " is being updated.")
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
            })
          }
        } else {
          console.log(item.uuid + " is already most updated.")
        }
      } else {
        delete item._id
        delete item.id
        Hash.create(item).exec(function (createErr, entry) {
          if (createErr) {
            console.error("\nERROR on Hash.create! " + JSON.stringify(item))
            console.log(createErr)
          }
        })
      }
    })
}

exports.remove = function (uuid) {
  console.log("HashHelpers.remove('" + uuid + "')")
  Hash.destroy({ uuid: uuid }).exec(function(err) {
    if (err) {
      console.warn("Error: HashHelpers.remove('" + uuid + "')")
    }
  })
}
