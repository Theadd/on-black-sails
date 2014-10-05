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
      process.nextTick(function () {
        self.spawnChildProcesses()
      })
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

EntityObject.prototype.addLinkedEntity = function (name, config) {
  LinkedEntity.create({name: name, config: config}).exec(function(err, entry) {
    if (!err) {
      console.log("\n[addLinkedEntity]\tADDED! " + entry.name + ", enabled: " + entry.enabled)
    } else {
      console.log(err)
    }
  })
}

EntityObject.prototype.spawnChildProcesses = function () {
  var self = this

  LinkedEntity.find({enabled: true}).exec(function(err, entries) {
    if (!err && entries.length) {
      for (var i in entries) {
        entries[i].config['name'] = entries[i].name
        self._spawnChildProcessQueue.push(entries[i].config)
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
    var config = self._spawnChildProcessQueue.shift()
    self.spawnChildProcess(config, function (err, childProcessKey) {
      if (err) {
        console.error(err)
      } else {
        console.log("FORKED " + childProcessKey + " on port " + cluster.workers[childProcessKey].config.port)
      }
      return self.spawnNextChildProcess()
    })
  }
}

EntityObject.prototype.spawnChildProcess = function (processConfig, callback) {
  var self = this,
    ports = self.getRequiredPorts(processConfig)

  new TestPorts(ports, function (err, res) {
    if (res.taken.length) {
      return callback(new Error("FAILED TO SPAWN CHILD PROCESS, ONE OR MORE REQUIRED PORTS ARE ALREADY TAKEN"))
    } else {
      var childProcessKey = self._spawnChildProcess(processConfig)
      return callback(null, childProcessKey)
    }
  })
}

EntityObject.prototype._spawnChildProcess = function (processConfig) {
  var self = this
  console.log("\t\tspawnChildProcess("+processConfig.port+")" + process.env.PORT + ",,, " + Number(sails.config.port))

  console.log("FORKING ON PORT: " + processConfig.port)
  process.env.PORT = processConfig.port
  cluster.fork()


  var workerKeys = Object.keys(cluster.workers),
    childProcessKey = workerKeys[workerKeys.length - 1]

  cluster.workers[childProcessKey].config = processConfig

  cluster.workers[childProcessKey].on('message', function (msg) {
    console.log("\t---> Handling message of " + (childProcessKey || -1))
    self.handleMessageOnMaster(msg)
  })

  return childProcessKey
}

EntityObject.prototype.handleMessageOnMaster = function (msg) {
  var self = this

  if (msg.cmd || false) {
    switch (msg.cmd) {
      case 'ready':
        console.log("MSG ready ON MASTER")
        cluster.workers[msg.id].send({ cmd: 'configure', val: cluster.workers[msg.id].config })
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

EntityObject.prototype.getRequiredPorts = function (config) {
  var ports = []

  ports.push(config.port)
  if (config.metadata.active) ports.push(config.metadata.port)
  if (config.tracker.active) ports.push(config.tracker.port)
  if (config.status.active) ports.push(config.status.port)
  if (config.media.active) ports.push(config.media.port)
  if (config.propagate.active) ports.push(config.propagate.port)

  return ports
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
