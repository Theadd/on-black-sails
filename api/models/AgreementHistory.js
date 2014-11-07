/**
 * AgreementHistory.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

var extend = require('util')._extend

module.exports = {

  autoPK: true,
  schema: true,
  migrate: 'alter',
  autoCreatedAt: false,
  autoUpdatedAt: false,

  attributes: {

    agreement: {
      type: 'integer',
      required: true
    },

    filter: {
      type: 'string',
      required: true
    },

    incoming: {
      type: 'boolean',
      required: true
    },

    date: {
      type: 'datetime',
      defaultsTo: function() {
        var d = new Date()
        d.setMinutes(Math.floor(d.getMinutes() / 10) * 10)
        d.setSeconds(0)
        d.setMilliseconds(0)
        return d
      }
    },

    info: {
      type: 'json',
      defaultsTo: {}
    }

  },

  store: function (agreement, filter, incoming, info, callback) {
    var d = new Date()
    d.setMinutes(Math.floor(d.getMinutes() / 10) * 10)
    d.setSeconds(0)
    d.setMilliseconds(0)
    agreement = parseInt(agreement)
    callback = callback || function () {}

    if (!(agreement && filter && info)) return callback(new Error('Missing required parameters.'))

    var query = {agreement: agreement, filter: filter, incoming: incoming, date: d}

    AgreementHistory.findOne(query).exec(function (err, entry) {
      if (err) return callback(err)
      if (entry && entry.agreement) {
        var param

        for (param in info) {
          if (typeof entry.info[param] !== "number") entry.info[param] = 0
        }

        for (param in entry.info) {
          if (info[param]) entry.info[param] += info[param]
        }
        entry.save(callback)
      } else {
        query.info = extend({}, info)
        AgreementHistory.create(query).exec(function(err, res) {
          return callback(err, res)
        })
      }
    })
  }

}

