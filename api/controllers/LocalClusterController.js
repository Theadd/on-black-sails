/**
 * LocalClusterController
 *
 * @description :: TODO: Description
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  index: function (req, res) {

    LocalCluster.find({}).exec(function (err, clusters) {
      res.view({
        clusters: clusters
      })
    })
  },

  edit: function (req, res) {

    LocalCluster.findOne(req.param('id'), function (err, cluster) {
      if (err) return next(err)

      res.view({
        cluster: cluster
      })
    })

  },

  update: function (req, res) {
    var id = req.param('id'),
      name = req.param('name'),
      url = req.param('url')

    if (id && name && url) {
      LocalCluster.modify(id, name, url, function (err, cluster) {
        if (err) {
          req.session.flash = {
            err: [
              {name: 'updateError', message: err.message}
            ]
          }
          return res.redirect('/localcluster/edit/' + id)
        } else {
          req.session.flash = {
            msg: [
              {name: 'updated', message: "Successfully updated"}
            ]
          }
          return res.redirect('/localcluster/')
        }
      })
    } else {
      req.session.flash = {
        err: [
          {name: 'updateError', message: "All fields required."}
        ]
      }
      return (id) ? res.redirect('/localcluster/edit/' + id) : res.redirect('/localcluster/')
    }
  }

}
