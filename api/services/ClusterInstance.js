/**
 * Created by Theadd on 15/11/2014.
 */

var extend = require('node.extend')
var requestify = require('requestify')

module.exports.Instance = Instance

var instances = {}

module.exports.get = function (id, callback) {
  if (!id) return callback(new Error("Missing required parameter: id"))

  if (typeof instances[id] === "undefined") {
    LocalCluster.findOne(id, function (err, localcluster) {
      if (err) return callback(err)
      if (!localcluster) return callback(new Error("LocalCluster not found."))

      instances[id] = new Instance(localcluster)
      return callback(null, instances[id])
    })
  } else {
    return callback(null, instances[id])
  }
}

module.exports.deploy = function (localcluster) {

  LocalCluster.getMaster(function (err, master) {
    if (!err && !!master) {
      ClusterInstance.get(master.id, function (err, masterInstance) {

        if (Entity.isSlave) {
          if (localcluster.status == 'pending') {
            masterInstance.requestSettings(function (err, res) {
              if (err) {
                sails.log.error(err)
                Entity.terminate(true)
              } else {
                console.log("Settings updated, terminating. Run it again!")
                localcluster.status = 'ready'
                localcluster.save(function () {
                  Entity.terminate(true)
                })
              }
          })
          }
        }

      })
    }
  })

}

function Instance (localcluster) {
  var self = this
  if (!(self instanceof Instance)) return new Instance(localcluster)

  self.values = extend(true, {}, localcluster)
  self.temp = 0
}

Instance.prototype.request = function (params, callback) {
  var self = this,
    url = self.values.url + "localcluster/request",
    data = extend(true, {}, params, { instance: Entity.localCluster }),
    encoded = Common.Encode(data, self.values.hash),
    parsed, decoded

  callback = callback || function () {}

  requestify.get(url, {
    params: {
      data: encoded
    }
  }).then(function(response) {
    response.getBody()
    try {
      parsed = JSON.parse(response.body)
      if (parsed.error) return callback(new Error(parsed.error))
      decoded = Common.Decode(parsed.data, Settings.get('localcluster'))
      return callback(null, decoded)
    } catch (e) {
      return callback(e, response.body)
    }
  }, function(error) {
    callback(error)
  })
}

Instance.prototype.handleRequest = function (data, callback) {
  var self = this,
    params = Common.Decode(data, self.values.hash)

  if (params.instance || false) {
    ClusterInstance.get(params.instance, function (err, instance) {
      if (err) return callback(err)

      self._handleRequest(params, function (err, response) {
        var encoded = Common.Encode(response, instance.values.hash)
        return callback(null, encoded)
      })
    })
  } else {
    return callback(new Error("Invalid data format."))
  }
};

Instance.prototype._handleRequest = function (params, callback) {
  var self = this, response = {}, i, controlled

  switch (params.type) {
    case 'settings':
      for (i in Settings._config) {
        if (["localcluster", "port"].indexOf(i) != -1) continue;
        response[i] = Settings._config[i].value
      }
      return callback(null, response)
      break
    case 'respawn':
      controlled = Entity.getControlledEntity(params.linkedentity)
      if (controlled.get('localcluster') == Entity.localCluster) {
        controlled.respawn(params.forcerespawn)
      } else {
        return callback(new Error("Specified LinkedEntity does not belong to this local cluster: " + Entity.localCluster))
      }
      break
    case 'reload':
      Entity.loadControlledEntities(function () {
        controlled = Entity.getControlledEntity(params.linkedentity)
        if (controlled) {
          LinkedEntity.findOne(params.linkedentity, function (err, entity) {
            if (err) return callback(err)
            controlled.reset(entity, callback)
          })
        } else {
          return callback(new Error("ControlledEntity not found."))
        }
      })
      break
    case 'update':
      controlled = Entity.getControlledEntity(params.linkedentity)
      if (controlled) {
        controlled.set(params.prop, params.value, true)
      } else {
        return callback(new Error("ControlledEntity not found."))
      }
      break
    default:
      return callback(new Error("Unrecognized request type."))
  }
}

Instance.prototype.requestSettings = function (callback) {
  var self = this,
    requestParams = {type: 'settings'}

  self.request(requestParams, function (err, params) {
    if (err) return callback(err)

    for (var i in params) {
      Settings.set(i, params[i])
    }

    Settings.save(callback)
  })
}

Instance.prototype.requestRespawn = function (id, forceRespawn, callback) {
  var self = this,
    requestParams = {type: 'respawn', linkedentity: id, forcerespawn: forceRespawn}

  self.request(requestParams, function (err, params) {
    return callback(err, params)
  })
}
