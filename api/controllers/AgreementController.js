/**
 * AgreementController
 *
 * @description :: Server-side logic for managing settings
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var extend = require('util')._extend

module.exports = {
  index: function(req, res, next) {
    var requestify = require('requestify')

    console.log("in agreement index")


    Cluster.send('agreement', {}, function (err, response) {
      if (err) {
        console.log(err)
        res.view({ agreements: {
          pending: [],
          cluster: Settings.get('cluster')
        }})
      } else {
        console.log(response.data)
        var agreements = []

        for (var i in response.data) {
          var agreement = {}, raw = extend({}, response.data[i])
          if (Settings.get('cluster') != raw.sender.id) {
            agreement.issender = false;
            agreement.localnode = extend({}, raw.receiver)
            agreement.remotenode = extend({}, raw.sender)
            //sender is remotenode, outgoing (remote offer)
            agreement.remotenode.allsources = raw.outgoingallsources
            agreement.remotenode.filters = raw.outgoingfilters
            //receiver is localnode, incoming (our offer)
            agreement.localnode.allsources = raw.incomingallsources
            agreement.localnode.filters = raw.incomingfilters
          } else {
            agreement.issender = true;
            agreement.localnode = extend({}, raw.sender)
            agreement.remotenode = extend({}, raw.receiver)
            //sender is localnode, outgoing (our offer)
            agreement.localnode.allsources = raw.outgoingallsources
            agreement.localnode.filters = raw.outgoingfilters
            //receiver is remotenode, incoming (remote offer)
            agreement.remotenode.allsources = raw.incomingallsources
            agreement.remotenode.filters = raw.incomingfilters
          }
          agreement.title = raw.title
          agreement.status = raw.status
          agreement.note = raw.note
          agreement.id = raw.id
          agreement.createdAt = raw.createdAt
          agreements.push(agreement)
        }

        res.view({ agreements: agreements})
      }
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
  }

}
