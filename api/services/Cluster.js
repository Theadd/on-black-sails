/**
 * Created by Theadd on 20/10/2014.
 */

var extend = require('util')._extend
var requestify = require('requestify')
var bcrypt = require('bcrypt')
var objectHash = require('object-hash')

module.exports = new Cluster()

function Cluster () {
  var self = this
  if (!(self instanceof Cluster)) return new Cluster()

  //self._agreement = {}
}

Cluster.prototype.updateClusterStats = function (interval) {
  var self = this, total = 0, downloaded = 0, scraped = 0
  if (Settings.get('ready')) {
    Hash.count({}, function (err, num) {
      total = num || 0
      Hash.count({downloaded: true}, function (err, num) {
        downloaded = num || 0
        Hash.count({updatedBy: {'>': 0}}, function (err, num) {
          scraped = num || 0
          self.setStats(total, downloaded, scraped)
        })
      })
    })
  }

  if (interval || false) {
    setInterval(function() {
      self.updateClusterStats()
    }, interval)
  }
}

Cluster.prototype.setStats = function (total, downloaded, scraped) {
  this.send('cluster/update', {
    total: total,
    downloaded: downloaded,
    scraped: scraped
  })
}

Cluster.prototype.send = function (action, data, callback) {
  var self = this,
    _data = extend({}, data)
  if (typeof _data.key !== "undefined") {
    delete _data.key
  }
  if (typeof _data.id !== "undefined") {
    delete _data.id
  }
  _data.url = Settings.get('publicaddress')
  _data.key = self.buildKey(Settings.get('identitykey'), _data)
  if (typeof callback !== "function") {
    callback = function(){}
  }

  requestify.post(Settings.get('realm') + action, _data).then(function(response) {
    response.getBody()
    var body = {}
    try {
      body = JSON.parse(response.body)
      if (body.error) {
        return callback(new Error("[REPLY FROM REALM] " + body.error))
      } else {
        return callback(null, body)
      }
    } catch (e) {
      sails.log.error(e)
      sails.log.error(response.body)
      return callback(e)
    }
  }, function(error) {
    callback(error)
  })

}

Cluster.prototype.buildKey = function (key, data) {
  return bcrypt.hashSync(key + objectHash(data), 10)
}

Cluster.prototype.register = function (callback) {
  Settings.set('ready', false)

  requestify.post(Settings.get('realm') + 'cluster/create', {
    url: Settings.get('publicaddress'),
    name: Settings.get('clustername'),
    hash: Settings.get('identitykey'),
    indexfiles: Settings.get('indexfiles'),
    removedead: Settings.get('removedead')
  }).then(function(response) {
    response.getBody()
    var body = {}
    try {
      body = JSON.parse(response.body)
      if (body.error) {
        return callback(new Error("[REPLY FROM REALM] " + body.error))
      } else {
        var clusterId = Number(body.data.cluster)
        if (clusterId > 0) {
          Settings.set('cluster', clusterId)
          Settings.set('ready', true)
          return callback(null)
        } else {
          return callback(new Error('Cluster ID was expected from realm.'))
        }
      }
    } catch (e) {
      sails.log.error(e)
      sails.log.error(response.body)
      return callback(e)
    }
  }, function(error) {
    callback(error)
  })
}

Cluster.prototype.getRealmClusters = function (callback) {
  var self = this

  self._requestRealmClusters(function (err, res) {
    if (err) return callback(err)
    if (typeof res.error === "undefined") return callback(new Error("Unexpected"))
    if (res.error) return callback(new Error("[REPLY FROM REALM] " + res.error))

    self._setRealmClusters(res.data || [], function() {
      Realm.find().exec(function (err, entries) {
        callback(err, entries)
      })
    })


  })
}

Cluster.prototype._setRealmClusters = function (data, callback) {
  var self = this

  if (data && typeof data === "object" && data.length) {
    var item = data.shift()
    self._setRealmCluster(item, function() {
      return self._setRealmClusters(data, callback)
    })
  } else return callback()
}

Cluster.prototype._requestRealmClusters = function (callback) {

  requestify.post(Settings.get('realm') + 'cluster', {
    url: Settings.get('publicaddress')
  }).then(function(response) {
    response.getBody()
    var body = {}
    try {
      body = JSON.parse(response.body)
      callback(null, body)
    } catch (e) {
      sails.log.error(e)
      sails.log.error(response.body)
      return callback(e)
    }
  }, function(error) {
    callback(error)
  })
}

Cluster.prototype._setRealmCluster = function (data, callback) {
  var self = this,
    clean = self._cleanCluster(data)

  Realm.find({id: clean.id}).exec(function (err, entries) {
    if (err || !entries.length) {
      Realm.create(clean).exec(function(err, entry) {
        return callback(err)
      })
    } else {
      var id = clean.id
      delete clean.id

      Realm.update({ id: id }, clean, function (err, entries) {
        return callback(err)
      })
    }
  })
}

Cluster.prototype._cleanCluster = function (data) {
  return {
    id: Number(data.id || 0),
    name: String(data.name || ''),
    url: (Common.ValidURL(data.url || '')) ? (data.url || '') : 'INVALID',
    note: String(data.note || ''),
    reputation: Number(data.reputation || 0),
    status: String(data.status || 'INVALID'),
    indexfiles: Boolean(JSON.parse(data.indexfiles || false)),
    removedead: Boolean(JSON.parse(data.removedead || false)),
    total: Number(data.total || 0),
    downloaded: Number(data.downloaded || 0),
    scraped: Number(data.scraped || 0)
  }
}

Cluster.prototype.validate = function (data) {
  var key = data.key || ''

  delete data.key
  return (bcrypt.compareSync(Settings.get('identitykey') + objectHash(data), key)) ? data : false
}

Cluster.prototype.getProfile = function (callback) {
  var self = this
  var data = {
    url: Settings.get('publicaddress')
  }
  self.send('cluster/show', data, function (err, res) {
    if (err) return callback(err)
    return callback(null, res.data)
  })
}

Cluster.prototype.updateProfile = function (params, callback) {
  var self = this
  var data = extend({}, params)
  data.url = Settings.get('publicaddress')

  self.send('cluster/update', data, function (err, res) {
    if (err) return callback(err)
    return callback(null, res.data)
  })
}

Cluster.prototype.requestAndBuildAgreements = function (callback) {
  var self = this
  callback = callback || function () {}

  self.send('agreement', {}, function (err, response) {
    if (err) return callback(err)

    for (var i in response.data) {
      self.updateAgreement(response.data[i])
    }

    return callback(null, true)
  })
}

Cluster.prototype.updateAgreement = function (data) {
  var self = this

  Agreement.import(data, function (err, imported, prevStatus) {
    if (!imported.hash && imported.status == 'accepted') {
      self.send('agreement/hash', {agreement: imported.id}, function (err, response) {
        if (response.data) {
          var decoded = Common.Decode(response.data, Settings.get('identitykey'))
          if (decoded.length > 20) {
            imported.hash = decoded
            imported.save(function (err, res) {
              if (err) sails.log.error(err)

              self.handleSpecialControlledEntities(imported, prevStatus || '')
            })
          }
        }
      })
    } else {
      self.handleSpecialControlledEntities(imported, prevStatus || '')
    }
  })
}

Cluster.prototype.handleSpecialControlledEntities = function (agreement, prevStatus) {
  var action = ''

  if (prevStatus == 'accepted') {
    if (agreement.status == 'paused') {
      action = 'pause'
    } else if (agreement.status != 'accepted') {
      action = 'stop'
    }
  } else {
    if (prevStatus == 'paused') {
      if (agreement.status == 'accepted') {
        action = 'resume'
      } else {
        action = 'stop'
      }
    } else {
      if (agreement.status == 'accepted') {
        action = 'start'
      }
    }
  }

  console.log("\n>>> HANDLE! agreement.id: " + agreement.id + ", status: " + agreement.status + ", prevStatus: " + prevStatus + ", action: " + action)
  if (action) {
    for (var i in agreement.localnode.filters) {
      var filter = agreement.localnode.filters[i]
      console.log("\tGET IT! filter: " + filter + ", createIfNotExist: " + (action == 'start' || action == 'resume'))
      Entity.getSpecialControlledEntity(
        agreement.id,
        filter,
        (action == 'start' || action == 'resume'),
        '[' + agreement.remotenode.name + '] ' + agreement.title + ' #' + agreement.id,
        function (err, controlled) {
          console.log("\t\tIn callback, err: " + err + ", controlled: " + Boolean(controlled))
          if (!err && controlled) {
            console.log("\t\tready: " + controlled.get('ready'))
            //TODO: pause & resume
            switch (action) {
              case 'start':
                if (!controlled.get('ready')) {
                  controlled.set('enabled', true)
                  controlled.set('respawn', true)
                  controlled.setRespawnByForce(true)
                  Entity._spawnChildProcessQueue.push(controlled.get('id'))
                  console.log("\t\t\tACTION: " + action + ", spawn id: " + controlled.get('id'))
                  console.log(controlled)
                  Entity.spawnNextChildProcess()
                }
                break
              case 'stop':
                if (controlled.get('ready')) {
                  console.log("\t\t\tACTION: " + action + ", kill id: " + controlled.get('id'))
                  controlled.set('enabled', false)
                  controlled.send('kill')
                }
                break
            }
          }
        }
      )
    }
  }

}
