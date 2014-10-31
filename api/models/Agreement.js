/**
* Agreement.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

var extend = require('util')._extend

module.exports = {

  autoPK: false,
  schema: true,
  migrate: 'alter',
  autoCreatedAt: true,
  autoUpdatedAt: true,

  attributes: {

    id: {
      type: 'integer',
      primaryKey: true,
      unique: true
    },

    title: {
      type: 'string',
      defaultsTo: ''
    },

    note: {
      type: 'string',
      defaultsTo: ''
    },

    hash: {
      type: 'string',
      defaultsTo: ''
    },

    localnode: {
      type: 'json',
      defaultsTo: {}
    },

    remotenode: {
      type: 'json',
      defaultsTo: {}
    },

    params: {
      type: 'json',
      defaultsTo: {}
    },

    sender: {
      type: 'integer',
      required: true
    },

    status: {
      type: 'string',
      enum: ['pending', 'accepted', 'denied', 'cancelled', 'paused', 'deleted'],
      defaultsTo: 'pending'
    },

    toJSON: function () {
      var obj = this.toObject()
      delete obj.hash
      delete  obj.params
      return obj
    },

    isSender: function () {
      return (this.localnode.id == this.sender)
    },

    getParam: function (filter, param) {
      if (filter) {
        if (param) {
          if (this.params[filter]) {
            return this.params[filter][param] || null
          }
        } else {
          return this.params[filter] || {}
        }
      } else {
        return this.params
      }
    },

    setParam: function (filter, param, value, cb) {
      cb = cb || function () {}
      if (!this.params[filter]) this.params[filter] = {}
      this.params[filter][param] = value
      this.save(cb)
    },

    setParams: function (filter, params, cb) {
      cb = cb || function () {}
      this.params[filter] = params
      this.save(cb)
    },

    getActions: function () {
      var actions = extend({}, {
        accept: {
          key: 'accept',
          display: 'Accept',
          help: 'Accept',
          enabled: false
        },
        refuse: {
          key: 'refuse',
          display: 'Refuse',
          help: 'Refuse',
          enabled: false
        },
        cancel: {
          key: 'cancel',
          display: 'Cancel',
          help: 'Cancel',
          enabled: false
        },
        pause: {
          key: 'pause',
          display: 'Pause',
          help: 'Pause',
          enabled: false
        },
        resume: {
          key: 'resume',
          display: 'Resume',
          help: 'Resume',
          enabled: false
        },
        delete: {
          key: 'delete',
          display: 'Delete',
          help: 'Delete',
          enabled: false
        }
      })

      switch (this.status) {
        case 'pending':
          actions.accept.enabled = !this.isSender()
          actions.refuse.enabled = !this.isSender()
          actions.cancel.enabled = this.isSender()
          break;
        case 'accepted':
          actions.pause.enabled = true
          actions.cancel.enabled = true
          break;
        case 'denied':
          actions.delete.enabled = this.isSender()
          break;
        case 'cancelled':
          actions.delete.enabled = this.isSender()
          break;
        case 'paused':
          actions.resume.enabled = true
          actions.cancel.enabled = true
          break;
      }

      return actions
    }
  },

  import: function (raw, callback) {

    Agreement.findOne({id: raw.id}).exec(function(err, entry) {
      if (err) return callback(err)
      if (!entry) {
        //not yet created
        Agreement.convert(raw, function (err, data) {
          Agreement.create(data).exec(function (err, agreement) {
            var values = extend({}, agreement)
            var actions = agreement.getActions()
            values.actions = []
            for (var i in actions) {
              values.actions.unshift(actions[i])
            }
            delete values.hash
            Agreement.publishCreate({
              id: agreement.id,
              name: agreement.title,
              action: 'created',
              value: values
            })
            return callback(err, agreement)
          })
        })
      } else {
        //already created, update...
        Agreement.convert(raw, function (err, data) {
          var differs = (entry.status != data.status),
            prevStatus = entry.status

          entry = extend(entry, data)
          entry.save(function (err, response) {
            if (!err && differs) {
              var actions = response.getActions()
              data.actions = []
              for (var i in actions) {
                data.actions.unshift(actions[i])
              }
              delete data.hash
              Agreement.publishUpdate(data.id, {
                name: data.title,
                property: 'data',
                value: data,
                action: 'updated'
              })
            }
            return callback(err, response, prevStatus)
          })

        })
      }
    })
  },

  convert: function (raw, callback) {
    var agreement = {}

    agreement.sender = raw.sender.id

    if (Settings.get('cluster') != raw.sender.id) {
      //agreement.issender = false;
      agreement.localnode = extend({}, raw.receiver)
      agreement.remotenode = extend({}, raw.sender)
      //sender is remotenode, outgoing (remote offer)
      agreement.remotenode.allsources = raw.outgoingallsources
      agreement.remotenode.filters = raw.outgoingfilters
      //receiver is localnode, incoming (our offer)
      agreement.localnode.allsources = raw.incomingallsources
      agreement.localnode.filters = raw.incomingfilters
    } else {
      //agreement.issender = true;
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
    agreement.updatedAt = raw.updatedAt

    return callback(null, agreement)
  }
}
