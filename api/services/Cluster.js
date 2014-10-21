/**
 * Created by Theadd on 20/10/2014.
 */

var extend = require('util')._extend
var requestify = require('requestify')
var bcrypt = require('bcrypt')
var crypto = require('crypto')
var objectHash = require('object-hash')

module.exports = new Cluster()

function Cluster () {
  var self = this
  if (!(self instanceof Cluster)) return new Cluster()

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
  this.send({
    total: total,
    downloaded: downloaded,
    scraped: scraped
  })
}

Cluster.prototype.send = function (data, callback) {
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
  console.log("in buildkey... key:\n" + _data.key)

  requestify.post(Settings.get('realm') + 'cluster/update', _data).then(function(response) {
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
