/**
 * TaskController
 *
 * @description :: Server-side logic for managing tasks
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  /*tracker: function (req, res) {
    var params = req.allParams()
    delete params['id']
    runHandlerActions(TrackerHandler, params)

    res.json({
      total: 'tracker'
    })
  },*/

  'show': function (req, res) {

    res.json(HandlerController.getStatistics())
  },

  'index': function (req, res) {

    res.json({index: true})
  },

  '*': function (req, res) {
    var params = req.allParams(),
      handler = getServiceHandler(String(params['id']))

    delete params['id']


    if (handler) {
      runHandlerActions(handler, params)
    }

    res.json({
      success: Boolean(handler)
    })
  }

};

var runHandlerActions = function (handler, params) {
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      handler.run({action: key, data: params[key]})
    }
  }
}

var getServiceHandler = function (handlerId) {
  var handler = false
  switch (handlerId.toLowerCase()) {
    case 'tracker':
      handler = TrackerHandler
      break;
    case 'status':
      handler = StatusHandler
      break;
    case 'metadata':
      handler = MetadataHandler
      break;
    case 'media':
      handler = MediaHandler
      break;
  }
  return handler
}

