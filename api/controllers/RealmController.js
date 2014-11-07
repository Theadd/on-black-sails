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
        clusters: response || [],
        localcluster: Settings.get('cluster')
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
  },

  edit: function(req, res) {
    Cluster.getProfile(function (err, response) {
      res.view({
        cluster: response || {}
      })
    })
  },

  update: function(req, res) {
    var params = req.params.all()

    delete params.id
    delete params._csrf
    params.private = (typeof params.private == "undefined") ? false : Boolean(JSON.parse(params.private))
    params.newagreements = (typeof params.newagreements == "undefined") ? false : Boolean(JSON.parse(params.newagreements))

    Cluster.updateProfile(params, function (err, response) {
      if (err) {
        req.session.flash = {
          err: [
            {name: 'updateProfileError', message: err.message}
          ]
        }
        return res.redirect('/realm/edit')
      } else {
        req.session.flash = {
          msg: [
            {name: 'updateProfileSuccess', message: 'Node updated successfully.'}
          ]
        }
        return res.redirect('/realm/edit')
      }
    })
  }

}

