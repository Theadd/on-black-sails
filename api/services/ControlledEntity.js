/**
 * Created by Theadd on 11/10/2014.
 */

var extend = require('node.extend');

var defaultEntity = {
  name: '',
  port: 1500,
  enabled: false,
  respawn: false,
  type: 'public',
  localcluster: false,
  config: {
    'index': {
      'kickass': {
        'active': false,
        'full': false
      },
      'bitsnoop': {
        'active': false,
        'full': false
      }
    },
    'metadata': {
      'active': false,
      'interval': 250,
      'retry': 5000,
      'silent': true,
      'host': 'localhost',
      'port': 8018,
      'onempty': false
    },
    'tracker': {
      'active': false,
      'interval': 350,
      'retry': 5000,
      'silent': true,
      'host': 'localhost',
      'port': 8010,
      'onempty': false
    },
    'status': {
      'active': false,
      'interval': 335,
      'retry': 5000,
      'silent': true,
      'host': 'localhost',
      'port': 8015,
      'onempty': false
    },
    'media': {
      'active': false,
      'interval': 500,
      'retry': 5000,
      'silent': true,
      'host': 'localhost',
      'port': 8013,
      'onempty': false
    },
    'propagate': {
      'active': false,
      'interval': 60000,
      'retry': 30000,
      'silent': true,
      'host': 'localhost',
      'port': 8011,
      'onempty': false,
      'agreement': 0
    },
    'live': false,
    'autoqueue': false
  }
}

module.exports = ControlledEntity

function ControlledEntity (entity) {
  var self = this
  if (!(self instanceof ControlledEntity)) return new ControlledEntity(entity)

  self._entity = extend(true, {}, defaultEntity)
  self._entity.localcluster = Entity.localCluster
  self._entity = extend(true, self._entity, entity)
  self._ready = false
  self._worker = false
  self._pid = false
  self._forceRespawn = false
  self._stats = {}
  self._errors = []
}

ControlledEntity.prototype.setWorker = function (worker) {
  var self = this

  if (typeof worker === "undefined" || worker == null) {
    self._worker = false
    self._ready = false
  } else {
    self._worker = worker
    self._ready = true
  }
}

ControlledEntity.prototype.getWorker = function () {
  return this._worker
}

ControlledEntity.prototype.getRequiredPorts = function () {
  var self = this, ports = [], config = self._entity.config

  ports.push(self.get('port'))
  if (config.metadata.active) ports.push(config.metadata.port)
  if (config.tracker.active) ports.push(config.tracker.port)
  if (config.status.active) ports.push(config.status.port)
  if (config.media.active) ports.push(config.media.port)
  if (config.propagate.active) ports.push(config.propagate.port)

  return ports
}

ControlledEntity.prototype.setRespawnByForce = function (force) {
  this._forceRespawn = Boolean(force)
}

ControlledEntity.prototype.getRespawnByForce = function () {
  return this._forceRespawn
}

ControlledEntity.prototype.respawn = function (forceRespawn, callback) {
  var self = this
  forceRespawn = forceRespawn || false
  callback = callback || function () {}
  self.setRespawnByForce(forceRespawn)

  if (self.get('localcluster') == Entity.localCluster) {
    Entity._spawnChildProcessQueue.push(self.get('id'))
    Entity.spawnNextChildProcess()
    return callback(null, true)
  } else {
    self.setWorker(null)
    ClusterInstance.get(self.get('localcluster'), function (err, instance) {
      if (err) {
        self.error(err)
        return callback(err)
      } else {
        instance.requestRespawn(self.get('id'), forceRespawn, function (err, params) {
          if (err) {
            self.error(err)
            return callback(err)
          }
          return callback(null, "success")
        })
      }
    })
  }

}

ControlledEntity.prototype.reset = function (entity, callback) {
  var self = this
  callback = callback || function () {}

  self._entity = extend(true, self._entity, entity)
  return callback(null, true)
}

ControlledEntity.prototype.error = function (err) {
  sails.log.error(err)
  //sails.log.debug(err.stack)
  this._errors.push(err)
}

ControlledEntity.prototype.get = function (prop) {
  var self = this, value = null

  switch (prop) {
    case 'port':
      value = self._entity.port
      break
    case 'worker':
      value = self._worker
      break
    case 'ready':
      value = self._ready
      break
    case 'name':
      value = self._entity.name
      break
    case 'pid':
      value = self._pid
      break
    case 'stats':
      value = self._stats
      self.send('stats', true)
      break
    case 'enabled':
      value = self._entity.enabled
      break
    case 'respawn':
      value = self._entity.respawn
      break
    case 'config':
      value = self._entity.config
      break
    case 'id':
      value = self._entity.id || false
      break
    case 'type':
      value = self._entity.type || 'public'
      break
    case 'localcluster':
      value = self._entity.localcluster || false
      break
    case 'propagate-onempty':
      value = self._entity.config.propagate.onempty || false
      break
    case 'propagate-agreement':
      value = self._entity.config.propagate.agreement || 0
      break
    default:
      console.warn("[ControlledEntity] Unrecognized property: " + prop)
  }

  return value
}

ControlledEntity.prototype.set = function (prop, value, doNotUpdateModel) {
  var self = this

  doNotUpdateModel = doNotUpdateModel || false

  switch (prop) {
    case 'ready':
      self._ready = Boolean(JSON.parse(value))
      if (self._ready && self.get('localcluster') == Entity.localCluster) {
        self.set('pid', self.get('worker').process.pid)
      }
      self._update(prop, self._ready, true)
      break
    case 'pid':
      self._pid = Number(value)
      break
    case 'stats':
      try {
        self._stats = extend(true, {}, value)
      } catch (e) {
        return sails.log.error(e)
      }
      self._update(prop, self._stats, true)
      break
    case 'enabled':
      console.log("ControlledEntity.set(enabled)")
      self._entity.enabled = Boolean(JSON.parse(value))
      self._update(prop, self._entity.enabled, doNotUpdateModel)

      break
    case 'name':
      self._entity.name = String(value)
      self._update(prop, self._entity.name, doNotUpdateModel)
      break
    case 'port':
      self._entity.port = Number(value)
      self._update(prop, self._entity.port, doNotUpdateModel)
      break
    case 'respawn':
      self._entity.respawn = Boolean(JSON.parse(value))
      self._update(prop, self._entity.respawn, doNotUpdateModel)

      break
    case 'type':
      if (['public', 'private', 'agreement'].indexOf(String(value)) != -1) {
        self._entity.type = String(value)
        self._update(prop, self._entity.type, doNotUpdateModel)
      }
      break
    case 'localcluster':
      self._entity.localcluster = value
      self._update(prop, self._entity.localcluster, true)
      break
    //CONFIG PROPERTIES, THEY DON'T GET UPDATED UNTIL SAVE()
    case 'live': self._entity.config.live = Boolean(JSON.parse(value)); break
    case 'autoqueue': self._entity.config.autoqueue = Common.ValueOfMultiSelect(value); break
    //crawlers
    case 'bitsnoop': self._entity.config.index.bitsnoop.active = Boolean(JSON.parse(value)); break
    case 'bitsnoop-full': self._entity.config.index.bitsnoop.full = Boolean(JSON.parse(value)); break
    case 'kickass': self._entity.config.index.kickass.active = Boolean(JSON.parse(value)); break
    case 'kickass-full': self._entity.config.index.kickass.full = Boolean(JSON.parse(value)); break
    //metadata
    case 'metadata': self._entity.config.metadata.active = Boolean(JSON.parse(value)); break
    case 'metadata-host': self._entity.config.metadata.host = String(value); break
    case 'metadata-port': self._entity.config.metadata.port = Number(value); break
    case 'metadata-interval': self._entity.config.metadata.interval = Number(value); break
    case 'metadata-onempty': self._entity.config.metadata.onempty = Common.ValueOfMultiSelect(value); break
    //tracker
    case 'tracker': self._entity.config.tracker.active = Boolean(JSON.parse(value)); break
    case 'tracker-host': self._entity.config.tracker.host = String(value); break
    case 'tracker-port': self._entity.config.tracker.port = Number(value); break
    case 'tracker-interval': self._entity.config.tracker.interval = Number(value); break
    case 'tracker-onempty': self._entity.config.tracker.onempty = Common.ValueOfMultiSelect(value); break
    //status
    case 'status': self._entity.config.status.active = Boolean(JSON.parse(value)); break
    case 'status-host': self._entity.config.status.host = String(value); break
    case 'status-port': self._entity.config.status.port = Number(value); break
    case 'status-interval': self._entity.config.status.interval = Number(value); break
    case 'status-onempty': self._entity.config.status.onempty = Common.ValueOfMultiSelect(value); break
    //media
    case 'media': self._entity.config.media.active = Boolean(JSON.parse(value)); break
    case 'media-host': self._entity.config.media.host = String(value); break
    case 'media-port': self._entity.config.media.port = Number(value); break
    case 'media-interval': self._entity.config.media.interval = Number(value); break
    case 'media-onempty': self._entity.config.media.onempty = Common.ValueOfMultiSelect(value); break
    //Propagate
    case 'propagate': self._entity.config.propagate.active = Boolean(JSON.parse(value)); break
    case 'propagate-host': self._entity.config.propagate.host = String(value); break
    case 'propagate-port': self._entity.config.propagate.port = Number(value); break
    case 'propagate-interval': self._entity.config.propagate.interval = Number(value); break
    case 'propagate-onempty': self._entity.config.propagate.onempty = String(value); break
    case 'propagate-agreement': self._entity.config.propagate.agreement = Number(value); break

    default:
      sails.log.warn("[ControlledEntity] Unrecognized property: " + prop)
  }
}

ControlledEntity.prototype._update = function (prop, value, doNotUpdateModel) {
  var self = this, updateValues = {}
  if (self.get('id') == false) return //Do not try to update if this entity is not yet created

  updateValues[prop] = value
  doNotUpdateModel = doNotUpdateModel || false

  if (!doNotUpdateModel) {
    LinkedEntity.update({ id: self.get('id') }, updateValues, function(err, entities) {
      sails.log.debug("\tUPDATED " + prop + " TO " + value + " FOR " + self.get('id'))
      if (err) {
        self.error(err)
      } else {
        for (var i in entities) {
          LinkedEntity.publishUpdate(entities[i].id, {
            name: entities[i].name,
            property: prop,
            value: value,
            action: 'updated'
          })
        }
      }
    })
  } else {
    sails.log.debug("\tPUBLISH (ONLY) " + prop + " TO " + value + " FOR " + self.get('id'))
    LinkedEntity.publishUpdate(self.get('id'), {
      name: self.get('name'),
      property: prop,
      value: value,
      action: 'updated'
    })
  }

  self.updateToMaster(prop)

}

ControlledEntity.prototype.updateToMaster = function (prop) {
  var self = this

  LocalCluster.getMaster(function (err, master) {
    if (!err && !!master) {
      if (Entity.localCluster != master.id) {

        ClusterInstance.get(master.id, function (err, masterInstance) {

          masterInstance.request({
            type: 'update',
            linkedentity: self.get('id'),
            prop: prop,
            value: self.get(prop)
          })

        })

      }
    }
  })
}

ControlledEntity.prototype.updateToSlave = function (prop) {
  var self = this

  if (self.get('localcluster') != Entity.localCluster && !Entity.isSlave) {
    console.log("ControlledEntity.updateToSlave("+prop+")")
    ClusterInstance.get(self.get('localcluster'), function (err, instance) {

      instance.request({
        type: 'update',
        linkedentity: self.get('id'),
        prop: prop,
        value: self.get(prop)
      })

    })
  }

}

ControlledEntity.prototype.create = function (callback) {
  var self = this

  if (self.get('id') == false) {

    LinkedEntity.create(self._entity).exec(function(err, entity) {
      if (err) return callback(err)

      var created = new ControlledEntity(entity)
      Entity._controlledEntity[entity.id] = created

      LinkedEntity.publishCreate({
        id: created.get('id'),
        name: created.get('name'),
        action: 'created'
      })

      callback(null, entity)
    })

  } else {
    callback(new Error("This entity already has an id."))
  }
}

ControlledEntity.prototype.update = function (callback) {
  var self = this

  if (self.get('id') != false) {
    var updateValues = extend(true, {}, self._entity)
    delete updateValues.id

    LinkedEntity.update({ id: self.get('id') }, updateValues, function(err, entity) {
      if (err) return callback(err)

      if (self.get('localcluster') != Entity.localCluster) {

        ClusterInstance.get(self.get('localcluster'), function (err, instance) {
          if (err) {
            self.error(err)
            return callback(err)
          } else {
            instance.request({type: 'reload', linkedentity: self.get('id')}, function (err, params) {
              if (err) {
                self.error(err)
                return callback(err)
              }
              return callback(null, "success")
            })
          }
        })

      } else {
        callback(null, entity)
      }
    })

  } else {
    callback(new Error("This entity does not have an id."))
  }
}

ControlledEntity.prototype.getClonedValues = function () {
  var self = this, result = extend(true, {}, self._entity)

  result.ready = self._ready
  result.pid = self._pid

  return result
}

ControlledEntity.prototype.send = function (command, value) {
  var self = this
  value = value || false
  command = String(command)

  if (self.get('worker')) {
    self.get('worker').send({ cmd: command, val: value })
  } else {

    if (self.get('localcluster') != Entity.localCluster) {
      console.log("ControlledEntity.send("+command+", "+value+") TO SLAVE IN LOCAL CLUSTER")
      ClusterInstance.get(self.get('localcluster'), function (err, instance) {
        if (err) {
          self.error(err)
        } else {
          instance.request({
            type: 'send',
            linkedentity: self.get('id'),
            cmd: command,
            val: value
          })
        }
      })

    }
  }
}

ControlledEntity.prototype.destroy = function (callback) {
  var self = this

  if (self.get('ready')) {
    return callback(new Error("This entity cannot be deleted while it's still running."))
  } else {
    var id = self.get('id')
    LinkedEntity.destroy({ id: self.get('id') }, function(err) {
      if (err) return callback(err)
      delete Entity._controlledEntity[id]
      LinkedEntity.publishDestroy(id)
      return callback(null)
    })
  }
}
