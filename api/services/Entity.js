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
      //self._controlledEntityRelation = {}
      cluster.on('exit', function(worker, code, signal) {
        sails.log.error("Worker " + worker._controlledEntity.get('name') + " <" + worker._controlledEntity.get('pid') + "> died (" + (signal || code) + ")")
        if (worker._controlledEntity.get('enabled') && worker._controlledEntity.get('respawn')) {
          sails.log.debug("Restarting worker " + worker._controlledEntity.get('name') + " <" + worker._controlledEntity.get('pid') + ">")
          self.spawnChildProcessByName(worker._controlledEntity.get('name'), true)
        }
      })
      process.nextTick(function () {
        self.loadControlledEntities(function (err) {
          if (err) {
            console.error(err)
          } else {
            self.spawnChildProcesses()
          }
        })
      })

      /*setTimeout(function () {
        console.log("console.log(self._controlledEntity)")
        console.log(self._controlledEntity)
        console.log("console.log(self._controlledEntity)")
      }, 10000)*/
    } else {
      //Standalone process NOT in linked entities (MASTER)
      if (CommandLineHelpers.config.clusterid == -1 || typeof CommandLineHelpers.config.clusterid !== "number") {
        console.log(CommandLineHelpers.usage())
        process.exit()
      } else {
        Indexer.run()
      }
    }
  } else {
    //Child process (WORKER)
    process.on('message', function(msg) {
      self.handleMessageOnWorker(msg)
    })
    self.id = cluster.worker.id
    process.send({ cmd: 'ready', id: self.id })
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
        console.log("\n[addLinkedEntity]\tADDED! " + entry.name + ", enabled: " + entry.enabled + ", port: " + port)
      } else {
        console.log(err)
      }
    })
  } catch (err) {
    console.error(err)
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
      callback(new Error("No linked entities found."))
    }
  })
}

EntityObject.prototype.spawnChildProcesses = function () {
  var self = this

  LinkedEntity.find({enabled: true}).exec(function(err, entries) {
    if (!err && entries.length) {
      for (var i in entries) {
        /*entries[i].config['name'] = entries[i].name
        entries[i].config['enabled'] = entries[i].enabled
        entries[i].config['respawn'] = entries[i].respawn
        entries[i].config['storedId'] = entries[i].id
        entries[i].config['port'] = entries[i].port

        console.log("\n\nentries[i].id = " + entries[i].id + "\n\n")*/

        //self._spawnChildProcessQueue.push(entries[i].config)
        self.getControlledEntity(entries[i].id).setRespawnByForce(false)
        self._spawnChildProcessQueue.push(entries[i].id)
      }
      self.spawnNextChildProcess()
    } else {
      console.error("No linked entities found!")
    }
  })
}

EntityObject.prototype.spawnChildProcessByName = function (name, force) {
  var self = this
  force = force || false

  LinkedEntity.find({name: name}).exec(function(err, entries) {
    if (!err && entries.length) {
      for (var i in entries) {
        /*entries[i].config['name'] = entries[i].name
        entries[i].config['enabled'] = entries[i].enabled
        entries[i].config['respawn'] = entries[i].respawn
        entries[i].config['port'] = entries[i].port
        entries[i].config['storedId'] = entries[i].id
        entries[i].config['force'] = force

        self._spawnChildProcessQueue.push(entries[i].config)*/
        self.getControlledEntity(entries[i].id).setRespawnByForce(true)
        self._spawnChildProcessQueue.push(entries[i].id)
      }
      self.spawnNextChildProcess()
    } else {
      console.error("No linked entities found!")
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
        console.log("FORKED " + childProcessKey)// + " on port " + cluster.workers[childProcessKey].config.port)
        controlledEntity.setWorker(cluster.workers[childProcessKey])
      }
      return self.spawnNextChildProcess()
    })
  }
}

EntityObject.prototype.spawnChildProcess = function (controlledEntity, callback) {
  var self = this,
    ports = controlledEntity.getRequiredPorts()

  new TestPorts(ports, function (err, res) {
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
  //console.log("\t\tspawnChildProcess("+processConfig.port+")" + process.env.PORT + ",,, " + Number(sails.config.port))

  //console.log("FORKING ON PORT: " + processConfig.port)
  process.env.PORT = controlledEntity.get('port')
  process.env.CHILD_PROCESS = true
  cluster.fork()

  var workerKeys = Object.keys(cluster.workers),
    childProcessKey = workerKeys[workerKeys.length - 1]

  cluster.workers[childProcessKey]._controlledEntity = controlledEntity

  cluster.workers[childProcessKey].on('message', function (msg) {
    console.log("\t---> Handling message of " + (childProcessKey || -1))
    self.handleMessageOnMaster(msg)
  })

  return childProcessKey
}

EntityObject.prototype.getControlledEntity = function (id) {
  return (typeof this._controlledEntity[id] !== "undefined") ? this._controlledEntity[id] : false
}


EntityObject.prototype.handleMessageOnMaster = function (msg) {
  var self = this

  if (msg.cmd || false) {
    switch (msg.cmd) {
      case 'ready':
        console.log("MSG ready ON MASTER")

        cluster.workers[msg.id]._controlledEntity.set('ready', true)

        console.log("that was  controlled, ready set")
        //controlled.setWorker(cluster.workers[msg.id])
        //console.log("done")
        cluster.workers[msg.id].send({ cmd: 'configure', val: cluster.workers[msg.id]._controlledEntity.get('config') })
        break
      case 'configured':
        console.log("MSG configured ON MASTER")
        cluster.workers[msg.id].send({ cmd: 'run'})
        break
      default:
        console.error("Unrecognized message on master: " + msg)
    }
  }
}

EntityObject.prototype.handleMessageOnWorker = function (msg) {
  var self = this

  if (msg.cmd || false) {
    switch (msg.cmd) {
      case 'configure':
        console.log("MSG configure")
        self.config = extend(self.config, msg.val)
        CommandLineHelpers.config = extend(CommandLineHelpers.config, self.config)  //TODO: refactoring
        process.send({ cmd: 'configured', id: self.id })
        break
      case 'run':
        Indexer.run()
        break
      default:
        console.error("Unrecognized message on worker: " + msg)
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

////////////////////////////////////////////////////////////////

function TestPorts (ports, callback) {
  var self = this
  if (!(self instanceof TestPorts)) return new TestPorts(ports, callback)

  self.queue = (ports || []).slice()
  self.available = []
  self.taken = []

  self.next(callback)
}

TestPorts.prototype.isPortTaken = function (port, fn) {
  var net = require('net')
  var tester = net.createServer()
    .once('error', function (err) {
      if (err.code != 'EADDRINUSE') return fn(err)
      fn(null, true)
    })
    .once('listening', function() {
      tester.once('close', function() { fn(null, false) })
        .close()
    })
    .listen(port)
}

TestPorts.prototype.next = function (callback) {
  var self = this

  if (self.queue.length) {
    var port = self.queue.shift()
    self.isPortTaken(port, function (err, taken) {
      if (err || taken) {
        self.taken.push(port)
      } else {
        self.available.push(port)
      }
      return self.next(callback)
    })
  } else return callback(false, {available: self.available, taken: self.taken})
}



