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
        entry.info = Common.SumObjectValues(entry.info, info)
        entry.save(callback)
      } else {
        query.info = extend({}, info)
        AgreementHistory.create(query).exec(function(err, res) {
          return callback(err, res)
        })
      }
    })
  },

  generate: function (agreement, filter, incoming, level, size, callback) {
    var d = new Date()
    d.setMinutes(Math.floor(d.getMinutes() / 10) * 10)
    d.setSeconds(0)
    d.setMilliseconds(0)
    agreement = parseInt(agreement)
    incoming = Boolean(incoming)
    callback = callback || function () {}

    if (!(agreement && filter && level && size)) return callback(new Error('Missing required parameters.'))

    var query = {agreement: agreement, filter: filter, incoming: incoming, date: {'<=': d}},
      data = []

    AgreementHistory.find(query).sort({date: 'desc'}).limit(size * level).exec(function (err, entries) {
      if (err) return callback(err)

      var merging = false,
        item = {}

      for (var i in entries) {

        if (entries[i].date < d) {

          if (merging) {
            //console.log("\t\t\t%%% FINAL: " + item)
            merging = false
            data.push({date: new Date(d), info: extend({}, item)})  //FIXME?
            d.setTime(d.getTime() - (600000 * level))
            item = {}
          }
          while (entries[i].date < d && data.length < size) {
            data.push({date: new Date(d), info: {}})
            d.setTime(d.getTime() - (600000 * level))
          }
          if (data.length >= size) break
        }
        //console.log("\t%%% ENTRY IN DATE: " + entries[i].date + " >= " + d)
        if (entries[i].date >= d) {
          merging = true
          item = Common.SumObjectValues(item, entries[i].info)
          //console.log("\t\t%%% MERGE WITH: " + entries[i].info)
        } else {

        }
      }
      if (merging) {
        //console.log("\t\t\t%%% FINAL: " + item)
        data.push({date: new Date(d), info: extend({}, item)})
        d.setTime(d.getTime() - (600000 * level))
      }
      while (data.length < size) {
        data.push({date: new Date(d), info: {}})
        d.setTime(d.getTime() - (600000 * level))
      }

      return callback(null, data)
    })
  }

}

