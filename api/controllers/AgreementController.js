/**
 * AgreementController
 *
 * @description :: Server-side logic for managing settings
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var extend = require('util')._extend

module.exports = {
  index: function(req, res, next) {

    var agreements = []

    Agreement.find({}).exec(function (err, clusterAgreements) {
      for (var id in clusterAgreements) {
        var agreement = clusterAgreements[id]
        var actions = clusterAgreements[id].getActions()
        agreement.actions = []
        for (var i in actions) {
          agreement.actions.unshift(actions[i])
        }

        agreements.unshift(agreement)
      }

      console.log("in agreement index")
      res.view({ agreements: agreements})
    })





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
  },

  /** PUBLISH SUBSCRIBE **/

  subscribe: function(req, res) {
    Agreement.find(function foundAgreements(err, agreements) {
      if (err) return next(err);

      Agreement.watch(req.socket);

      Agreement.subscribe(req.socket, agreements);

      res.send(200);
    })
  },

  /** ACTIONS **/

  'action': function(req, res) {
    var id = req.param('id'),
      action = req.param('action')

    console.log({agreement: id, type: action})

    Cluster.send('agreement/action', {agreement: id, type: action}, function (err, response) {
      console.log("IN Cluster.send('agreement/action', {agreement: id, type: '" + action + "'} callback:")
      console.error(err)
      console.log(response)
      if (!err) Cluster.requestAndBuildAgreements()
      res.json({
        error: err || false,
        data: response || {}
      })
    })
  }

}
