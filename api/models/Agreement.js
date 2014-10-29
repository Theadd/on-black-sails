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
      type: 'string',
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
      type: 'string'
    },

    localnode: {
      type: 'json',
      defaultsTo: {}
    },

    remotenode: {
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

    isSender: function (){
      return (this.localnode.id == this.sender)
    },

    getActions: function (){
      var actions = extend({}, agreementActions)

      switch (this.status) {
        case 'pending':
          actions.accept.enabled = !this.isSender()
          actions.refuse.enabled = !this.isSender()
          actions.cancel.enabled = this.isSender()
          break;
        case 'accepted':
          actions.pause.enabled = true
          actions.resume.enabled = true
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
            console.log("AGREEMENT CREATED! ")
            var values = extend({}, agreement)
            var actions = agreement.getActions()
            values.actions = []
            for (var i in actions) {
              values.actions.unshift(actions[i])
            }
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
          entry = extend(entry, data)
          console.log("AGREEMENT UPDATED! ")
          entry.save(callback)
          Agreement.publishUpdate(entry.id, {
            name: entry.title,
            property: 'data',
            value: data,
            action: 'updated'
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

var agreementActions = {
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
}
