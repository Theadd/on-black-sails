/**
 * RealmController
 *
 * @description :: Server-side logic for managing realms
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  index: function(req, res, next) {

    Cluster.getRealmClusters(function (err, response) {
      res.view({
        clusters: response || []
      })
    })
  },

  verify: function(req, res) {
    var params = req.params.all()
    delete params.id
    var data = Cluster.validate(params)
    if (data != false && data.url == Settings.get('realm')) {
      res.json({
        error: false
      })
    } else {
      res.json({
        error: 'Not part of this realm.'
      })
    }
  }

}

