/**
 * AgreementController
 *
 * @description :: Server-side logic for managing settings
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var extend = require('util')._extend

module.exports = {
  index: function(req, res) {

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

      res.view({ agreements: agreements})
    })

  },

  'new': function(req, res) {
    var id = req.param('id')

    res.view({
      receiver: id
    })
  },

  create: function(req, res) {
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

    Cluster.send('agreement/create', params, function (err) {
      if (err) {
        req.session.flash = {
          err: [
            {name: 'createAgreementError', message: err.message}
          ]
        }
      }
      Cluster.requestAndBuildAgreements( function () {
        return res.redirect('/agreement')
      })
    })
  },

  /** PUBLISH SUBSCRIBE **/

  subscribe: function(req, res, next) {
    Agreement.find(function foundAgreements(err, agreements) {
      if (err) return next(err)

      Agreement.watch(req.socket)

      Agreement.subscribe(req.socket, agreements)

      res.send(200)
    })
  },

  /** ACTIONS **/

  'action': function(req, res) {
    var id = req.param('id'),
      action = req.param('action')

    Cluster.send('agreement/action', {agreement: id, type: action}, function (err, response) {
      if (!err) Cluster.requestAndBuildAgreements()
      res.json({
        error: err || false,
        data: response || {}
      })
    })
  },

  /** IMPORT PROPAGATION OF REMOTE NODE **/

  'propagate': function(req, res) {
    var agreement = req.param('agreement'),
      filter = req.param('filter'),
      data = req.param('data')

    if (agreement && filter && data) {
      Agreement.findOne({id: agreement}).exec( function (err, entry) {
        if (err || !(entry && entry.hash)) {
          res.json({
            error: err || "Unexpected error."
          })
        } else {
          var _data = Common.Decode(data, entry.hash)

          if (_data instanceof Array) {
            var jobName = '' + agreement + "#" + filter

            HashHelpers.onMergeJobReady(jobName, function () {
              res.json({
                error: false,
                data: true
              })

              HashHelpers.mergeAllJob (jobName, _data, function (err, response) {
                AgreementHistory.store(agreement, filter, true, response)
              })

            })
          } else {
            res.json({
              error: err || "Unexpected data."
            })
          }
        }
      })
    } else {
      res.json({
        error: "Missing required parameters."
      })
    }
  },

  /** HISTORY **/

  'history': function(req, res) {
    var agreement = req.param('agreement'),
      filter = req.param('filter'),
      level = req.param('level'),
      size = 120

    if (agreement && filter && level) {

      AgreementHistory.generate(agreement, filter, level, size, function (err, statistics) {
        res.json({
          error: err || false,
          data: statistics
        })
      })
    } else {
      res.json({
        error: "Missing required parameters."
      })
    }
  }

}
