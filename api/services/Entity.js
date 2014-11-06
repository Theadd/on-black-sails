/**
 * Created by Theadd on 04/10/2014.
 */

var cluster = require('cluster')
var extend = require('util')._extend

module.exports = new EntityObject()

function EntityObject () {
  var self = this
  if (!(self instanceof EntityObject)) return new EntityObject()
  self.isMaster = false
  self.isPublic = true
  self.isAPI = true
  self.port = sails.config.port
  self._spawnChildProcessQueue = []
  self.id = 0
  self.config = {}
  self._controlledEntity = {}
}

module.exports.deploy = function() {
  var os = require('os'),
    self = this,
    standaloneProcess = cluster.isMaster

  sails.config['platform'] = os.platform()
  CommandLineHelpers.process()
  self.config = extend({}, CommandLineHelpers.config)

  if (standaloneProcess) {
    if (Boolean(sails.config.master)) {
      //Standalone process able to fork linked entities (MASTER)
      self.isMaster = true
      self._controlledEntity = {}
      Cluster.updateClusterStats(300000)
      Cluster.requestAndBuildAgreements()
      cluster.on('exit', function(worker, code, signal) {
        worker._controlledEntity.set('ready', false)
        sails.log.error("Worker " + worker._controlledEntity.get('name') + " <" + worker._controlledEntity.get('pid') + "> died (" + (signal || code) + ")")
        if (worker._controlledEntity.get('enabled') && worker._controlledEntity.get('respawn')) {
          sails.log.debug("Restarting worker " + worker._controlledEntity.get('name') + " <" + worker._controlledEntity.get('pid') + ">")
          //self.spawnChildProcessByName(worker._controlledEntity.get('name'), true)
          worker._controlledEntity.setRespawnByForce(true)
          self._spawnChildProcessQueue.push(worker._controlledEntity.get('id'))
          self.spawnNextChildProcess()
        }
      })
      process.nextTick(function () {
        self.loadControlledEntities(function (err) {
          if (err) {
            sails.log.error(err)
          } else {
            self.spawnChildProcesses()
          }
        })
      })

    } else {
      Indexer.run()
    }
  } else {
    //Child process (WORKER)
    process.on('message', function(msg) {
      self.handleMessageOnWorker(msg)
    })
    self.id = cluster.worker.id
    self.send('ready', true)
  }
}

EntityObject.prototype.addLinkedEntity = function (name, config, port, enabled, respawn) {
  try {
    if (typeof config === "string") {
      var fs = require('fs'),
        data = fs.readFileSync(config)

      config = JSON.parse(data)
    }
    port = (port || config.port || 1338)
    enabled = (typeof enabled !== "undefined") ? enabled : true
    respawn = (typeof respawn !== "undefined") ? respawn : true

    LinkedEntity.create({name: name, config: config, enabled: enabled, respawn: respawn, port: port}).exec(function (err, entry) {
      if (!err) {
        sails.log.debug("\n[addLinkedEntity]\tADDED! " + entry.name + ", enabled: " + entry.enabled + ", port: " + port)
      } else {
        sails.log.debug(err)
      }
    })
  } catch (err) {
    sails.log.error(err)
  }
}

EntityObject.prototype.loadControlledEntities = function (callback) {
  var self = this

  LinkedEntity.find({}).exec(function(err, entries) {
    if (!err && entries.length) {
      for (var i in entries) {
        self._controlledEntity[entries[i].id] = new ControlledEntity(entries[i])
      }
      callback(null, self._controlledEntities)
    } else {
      callback(null)
    }
  })
}

EntityObject.prototype.spawnChildProcesses = function () {
  var self = this

  LinkedEntity.find({enabled: true}).exec(function(err, entries) {
    if (!err && entries.length) {
      for (var i in entries) {

        self.getControlledEntity(entries[i].id).setRespawnByForce(false)
        self._spawnChildProcessQueue.push(entries[i].id)
      }
      self.spawnNextChildProcess()
    } else {
      sails.log.error("No linked entities found!")
    }
  })
}

EntityObject.prototype.spawnNextChildProcess = function () {
  var self = this

  if (self._spawnChildProcessQueue.length) {
    var controlledEntity = self.getControlledEntity(self._spawnChildProcessQueue.shift())
    self.spawnChildProcess(controlledEntity, function (err, childProcessKey) {
      if (err) {
        controlledEntity.error(err)
        controlledEntity.setWorker(null)
      } else {
        sails.log.debug("FORKED " + childProcessKey)// + " on port " + cluster.workers[childProcessKey].config.port)
        controlledEntity.setWorker(cluster.workers[childProcessKey])
      }
      return self.spawnNextChildProcess()
    })
  }
}

EntityObject.prototype.spawnChildProcess = function (controlledEntity, callback) {
  var self = this,
    ports = controlledEntity.getRequiredPorts()

  new Common.TestPorts(ports, function (err, res) {
    if (res.taken.length && !controlledEntity.getRespawnByForce()) {
      return callback(new Error("FAILED TO SPAWN CHILD PROCESS, ONE OR MORE REQUIRED PORTS ARE ALREADY TAKEN"))
    } else {
      var childProcessKey = self._spawnChildProcess(controlledEntity)
      return callback(null, childProcessKey)
    }
  })
}

EntityObject.prototype._spawnChildProcess = function (controlledEntity) {
  var self = this

  process.env.PORT = controlledEntity.get('port')
  process.env.CHILD_PROCESS = true
  cluster.fork()

  var workerKeys = Object.keys(cluster.workers),
    childProcessKey = workerKeys[workerKeys.length - 1]

  cluster.workers[childProcessKey]._controlledEntity = controlledEntity

  cluster.workers[childProcessKey].on('message', function (msg) {
    sails.log.debug("\t---> Handling message of " + (childProcessKey || -1))
    self.handleMessageOnMaster(msg)
  })

  return childProcessKey
}

EntityObject.prototype.getControlledEntity = function (id) {
  return (typeof this._controlledEntity[id] !== "undefined") ? this._controlledEntity[id] : false
}

EntityObject.prototype.getSpecialControlledEntity = function (agreement, filter, createIfNotExist, createWithName, callback) {
  var self = this

  if (typeof createWithName === "function") {
    callback = createWithName
    createWithName = "Agreement ID: " + agreement
  }

  for (var i in self._controlledEntity) {
    var controlled = self._controlledEntity[i]
    if (controlled.get('type') == 'agreement') {
      if (controlled.get('propagate-agreement') == agreement) {
        if (controlled.get('propagate-onempty') == filter) {
          return callback(null, controlled)
        }
      }
    }
  }
  if (createIfNotExist) {
    self.createSpecialControlledEntity(agreement, filter, createWithName, callback)
  } else {
    sails.log.debug(">>> IN getSpecialControlledEntity > return false")
    return false
  }
}

EntityObject.prototype.createSpecialControlledEntity = function (agreement, filter, name, callback) {
  var self = this,
    entity = new ControlledEntity({})

  sails.log.debug(">>> IN createSpecialControlledEntity")

  self.getNextPortAuto( function (err, port) {
    if (err || !port) return callback(err || new Error('Ports not available.'))

    entity.set('port', port)
    entity.set('name', name)
    entity.set('type', 'agreement')
    entity.set('propagate', true)
    entity.set('propagate-onempty', filter)
    entity.set('propagate-agreement', agreement)
    entity.set('propagate-port', port + 1)
sails.log.debug("... creating...")
    entity.create(function (err, result) {
      if (err) return callback(err)
      return callback(null, Entity._controlledEntity[result.id])
    })

  })
}

EntityObject.prototype.getNextPortAuto = function (callback) {
  var min = Settings.get('autoportstart')

  LinkedEntity.find({port: {'>=': min}}).sort({port: 1}).exec( function (err, entities) {
    if (err) return callback(err)
    if (!(entities && entities.length)) return callback(null, min)
    for (var i in entities) {
      var port = entities[i].port
      sails.log.debug(">>> getNextPortAuto: min: " + min + ", found: " + port)
      if (port >= min) {
        if (port == min) {
          min = port + 4
        } else if (min + 12 <= port) {
          return callback(null, min)
        } else {
          min = port + 4
        }
      }
    }
    return callback(null, min)
  })
}


EntityObject.prototype.handleMessageOnMaster = function (msg) {
  var self = this

  if (msg.cmd || false) {
    switch (msg.cmd) {
      case 'ready':
        cluster.workers[msg.id]._controlledEntity.set('ready', msg.val)
        if (msg.val) {
          cluster.workers[msg.id].send({ cmd: 'configure', val: cluster.workers[msg.id]._controlledEntity.get('config') })
        }
        break
      case 'configured':
        cluster.workers[msg.id].send({ cmd: 'run'})
        break
      default:
        sails.log.error("Unrecognized message on master: " + msg)
    }
  }
}

EntityObject.prototype.handleMessageOnWorker = function (msg) {
  var self = this

  if (msg.cmd || false) {
    switch (msg.cmd) {
      case 'configure':
        self.config = extend(self.config, msg.val)
        CommandLineHelpers.config = extend(CommandLineHelpers.config, self.config)  //TODO: refactoring
        process.send({ cmd: 'configured', id: self.id })
        break
      case 'run':
        Indexer.run()
        break
      case 'kill':
        self.terminate(true)
        break
      case 'pause':
        var service = ServiceQueueModel.getTargetService(msg.val)
        if (service) {
          service.active(false)
        }
        break
      case 'resume':
        var service = ServiceQueueModel.getTargetService(msg.val)
        if (service) {
          service.active(true)
        }
        break
      default:
        sails.log.error("Unrecognized message on worker: " + msg)
    }
  }
}

EntityObject.prototype.terminate = function (killProcess) {
  killProcess = killProcess || false
  sails.log.debug("Entity.terminate("+killProcess+")")

  TrackerService.terminate(false, true)
  StatusService.terminate(false, true)
  MediaService.terminate(false, true)
  MetadataService.terminate(false, true)
  if (killProcess) {
    if (cluster.isWorker)
      cluster.worker.disconnect()

    process.exit(0)
  }
}

EntityObject.prototype.send = function (command, value) {
  var self = this
  value = value || false
  command = String(command)

  if (!cluster.isMaster) {
    process.send({ cmd: command, val: value, id: self.id })
  }
}
