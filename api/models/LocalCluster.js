/**
 * LocalCluster.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

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
      required: true
    },

    master: {
      type: 'boolean',
      defaultsTo: false
    },

    url: {
      type: 'string',
      defaultsTo: ''
    },

    status: {
      type: 'string',
      enum: ['undefined', 'pending', 'ready'],
      defaultsTo: 'undefined'
    },

    running: {
      type: 'boolean',
      defaultsTo: true
    },

    setRunning: function (running, callback) {
      this.running = running
      this.save(callback)
    },

    toJSON: function() {
      var obj = this.toObject()
      delete obj.hash
      return obj
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

        var name = (asMaster) ? "Master" : "Slave"

        LocalCluster.create({hash: hash, master: asMaster, name: name}).exec(function (err, created) {
          if (err) return callback(err)

          Settings.save(function () {
            return callback(null, created)
          })
        })

      })

    })
  },

  modify: function (id, name, url, callback) {
    LocalCluster.findOne(id, function (err, localcluster) {
      if (err) return callback(err)
      if (localcluster && localcluster.id) {
        localcluster.name = name
        localcluster.url = url
        localcluster.status = (localcluster.master) ? 'ready' : 'pending'
        localcluster.save(callback)
      } else {
        return callback(new Error('Provided LocalCluster ID does not exist.'))
      }
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

    LocalCluster.get(hash, function (err, localcluster) {
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
