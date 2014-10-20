/**
 * RealmController
 *
 * @description :: Server-side logic for managing realms
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  index: function(req, res, next) {

    Cluster.getRealmClusters(function (err, response) {
      console.log("\nIn callback of Cluster.getRealmClusters")
      console.log(err)
      console.log(response)

      res.view({
        clusters: response || []
      })
    })
  }

}

