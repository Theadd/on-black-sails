/**
 * AgreementController
 *
 * @description :: Server-side logic for managing settings
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  index: function(req, res, next) {
    res.view({})
  },

  'new': function(req, res, next) {
    var id = req.param('id')
    console.log("receiver id: " + id)
    res.view({
      receiver: id
    })
  },

  create: function(req, res, next) {
    var params = req.params.all()
    params.outgoingfilters = params.outgoingfilters || []
    params.incomingfilters = params.incomingfilters || []
    if (typeof params.outgoingfilters === "string") params.outgoingfilters = [params.outgoingfilters]
    if (typeof params.incomingfilters === "string") params.incomingfilters = [params.incomingfilters]
    params.outgoingallsources = Boolean(JSON.parse(params.outgoingallsources || false))
    params.incomingallsources = Boolean(JSON.parse(params.incomingallsources || false))
    params.sender = Settings.get('cluster')
    delete params._csrf
    delete params.id

    Cluster.send('agreement/create', params, function (err, response) {
      console.log("in callback of cluster.send agreement/create")
      console.log(err)
      console.log(response)
      return res.redirect('/realm')
    })
  }

}