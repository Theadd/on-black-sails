/**
 * Created by Theadd on 11/09/2014.
 */

exports.merge = function (item) {
  Hash.find()
    .where({ uuid: item.uuid })
    .exec(function (err, entries) {
      if (!err && entries.length) {
        if (entries[0].rate != item.rate) {
          if (entries[0].updatedAt > item.updatedAt) {
            //do not update media info and status
            Hash.update({ uuid: item.uuid }, {
              seeders: item.seeders,
              leechers: item.leechers,
              updatedAt: entries[0].updatedAt,
              peersUpdatedAt: item.peersUpdatedAt,
              updatedBy: item.updatedBy
            }, function (err, hashes) {
              //updated
            })
          } else {
            //update media info too
            Hash.update({ uuid: item.uuid }, {
              seeders: item.seeders,
              leechers: item.leechers,
              updatedAt: item.updatedAt,
              peersUpdatedAt: item.peersUpdatedAt,
              updatedBy: item.updatedBy,
              rate: item.rate,
              media: item.media
            }, function (err, hashes) {
              //updated
            })
          }
        } else {
          Hash.update({ uuid: item.uuid }, {
            seeders: item.seeders,
            leechers: item.leechers,
            updatedAt: entries[0].updatedAt,
            peersUpdatedAt: item.peersUpdatedAt,
            updatedBy: item.updatedBy
          }, function (err, hashes) {
            //updated
          })
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
