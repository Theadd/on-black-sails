/**
 * Created by Theadd on 11/10/2014.
 */

var extend = require('util')._extend

module.exports = ControlledEntity

function ControlledEntity (entity) {
  var self = this
  if (!(self instanceof ControlledEntity)) return new ControlledEntity(entity)

  self._entity = extend({}, entity)
  self._ready = false
  self._worker = false
  self._pid = false
  self._forceRespawn = false
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

ControlledEntity.prototype.error = function (err) {
  console.error(err)
  console.log(err.stack)
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
      value = self._entity.id
      break
    default:
      console.warn("[ControlledEntity] Unrecognized property: " + prop)
  }

  return value
}

ControlledEntity.prototype.set = function (prop, value) {
  var self = this

  switch (prop) {
    case 'ready':
      self._ready = Boolean(value)
      if (Boolean(value)) {
        self.set('pid', self.get('worker').process.pid)
      }
      self._update(prop, self._ready, true)
      break
    case 'pid':
      self._pid = Number(value)
      break
    case 'enabled':
      self._entity.enabled = Boolean(value)
      self._update(prop, self._entity.enabled)
      break
    case 'respawn':
      self._entity.respawn = Boolean(value)
      self._update(prop, self._entity.respawn)
      break
    default:
      console.warn("[ControlledEntity] Unrecognized property: " + prop)
  }
}

ControlledEntity.prototype._update = function (prop, value, doNotUpdateModel) {
  var self = this, updateValues = {}

  updateValues[prop] = value
  doNotUpdateModel = doNotUpdateModel || false

  if (!doNotUpdateModel) {
    LinkedEntity.update({ id: self.get('id') }, updateValues, function(err, entities) {
      console.log("\tUPDATED " + prop + " TO " + value + " FOR " + self.get('id'))
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
    console.log("\tPUBLISH (ONLY) " + prop + " TO " + value + " FOR " + self.get('id'))
    LinkedEntity.publishUpdate(self.get('id'), {
      name: self.get('name'),
      property: prop,
      value: value,
      action: 'updated'
    })
  }

}

ControlledEntity.prototype.getClonedValues = function () {
  var self = this, result = extend({}, self._entity)

  result.ready = self._ready
  result.pid = self._pid

  return result
}

ControlledEntity.prototype.send = function (command, value) {
  var self = this
  value = value || false
  command = String(command)

  self.get('worker').send({ cmd: command, val: value })
}
