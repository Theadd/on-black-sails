/**
 * LocalCluster.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

var extend = require('node.extend');

module.exports = {

  autoPK: true,
  schema: true,
  migrate: 'alter',
  autoCreatedAt: true,
  autoUpdatedAt: true,

  attributes: {

    hash: {
      type: 'string',
      unique: true,
      required: true
    },

    name: {
      type: 'string',
      defaultsTo: ''
    },

    master: {
      type: 'boolean',
      defaultsTo: false
    },

    url: {
      type: 'string',
      defaultsTo: ''
    },

    running: {
      type: 'boolean',
      defaultsTo: true
    },

    setRunning: function (running, callback) {
      this.running = running
      this.save(callback)
    }

  },

  getMaster: function (callback) {
    LocalCluster.findOne({master: true}).exec(function (err, entry) {
      if (err) return callback(err)
      return callback(null, (entry && entry.id) ? entry : false)
    })
  },

  get: function (hash, callback) {
    LocalCluster.findOne({hash: hash}).exec(function (err, entry) {
      if (err) return callback(err)
      return callback(null, (entry && entry.id) ? entry : false)
    })
  },

  register: function (hash, asMaster, callback) {
    console.log("register local cluster: " + hash + ", asMaster: " + asMaster)

    LocalCluster.getMaster(function (err, master) {
      if (err) return callback(err)

      if (asMaster) {
        if (!!master) {
          return callback(new Error('Master already exists in this LocalCluster.'))
        }
      }

      LocalCluster.get(hash, function (err, exists) {
        if (err) return callback(err)

        if (!!exists) return callback(new Error('Hash already exists.'))

        LocalCluster.create({hash: hash, master: asMaster}).exec(function (err, created) {
          if (err) return callback(err)

          Settings.save(function () {
            return callback(null, created)
          })
        })

      })

    })
  },

  notify: function (asMaster, running, callback) {
    if (asMaster) {
      LocalCluster._notifyMaster(running, callback)
    } else {
      LocalCluster._notifySlave(running, callback)
    }
  },

  _notifyMaster: function (running, callback) {

    LocalCluster.getMaster(function (err, master) {
      if (err) return callback(err)
      var hash = Settings.get('localcluster')

      if (!!master) {
        if (!(master.hash == hash)) return callback(new Error('This is not master.'))
        master.setRunning(running, callback)
      } else {
        LocalCluster.register(hash, true, callback)
      }

    })
  },

  _notifySlave: function (running, callback) {
    var hash = Settings.get('localcluster')

    LocalCluster.get(function (err, localcluster) {
      if (err) return callback(err)

      if (!!localcluster) {
        if (localcluster.master) return callback(new Error('This LocalCluster was supposed to be master.'))
        localcluster.setRunning(running, callback)
      } else {
        LocalCluster.register(hash, false, callback)
      }

    })
  }

}
