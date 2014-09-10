/**
 * Created by Theadd on 9/4/14.
 */

var requestify = require('requestify')
var extend = require('util')._extend
module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  this.config({
    'recentPoolMaxSize': 250,
    //'poolMinSize': -1,
    'runInterval': CommandLineHelpers.config.propagate.interval,
    'appspace': 'onblacksails.',
    'id': 'propagate',
    'retry': CommandLineHelpers.config.propagate.retry,
    'silent': CommandLineHelpers.config.propagate.silent,
    'networkHost': CommandLineHelpers.config.propagate.host,
    'networkPort': CommandLineHelpers.config.propagate.port,
    'path': CommandLineHelpers.config.datapath
  })

  var self = this;
  self._isBusy = false;

  self.on('empty', function() {
    self.propagate()
  })
}

module.exports.getExchangeNode = function(uuid, callback) {
  ExchangeNode.find()
    .where({ uuid: Number(uuid) })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        callback(null, entries[0])
      } else {
        callback(err)
      }
    })
}

module.exports.propagate = function() {
  var self = this

  if (!self._isBusy) {
    self._isBusy = true;

    self.getExchangeNode(CommandLineHelpers.config.clusterid, function(err, thisExchangeNode) {
      self._propagate(err, thisExchangeNode);
    })
  } else {
    console.log("ªªª SERVICE BUSY! ªªª")
  }
}

module.exports._propagate = function(err, thisExchangeNode) {
  var self = this
  self._exchangeNodeCount = 0
  self._exchangeNodes = []

  ExchangeNode.find()
    .where({ enabled: true })
    .exec(function(err, entries) {
      if (!err && entries.length) {
        for (var i in entries) {
          if (entries[i].uuid != thisExchangeNode.uuid) {
            ++self._exchangeNodeCount
            self._exchangeNodeGet(thisExchangeNode, entries[i], 'active', '', function activeNodeCB(e, res) {
              if (!e) {
                if (res['active']) {
                  self._exchangeNodes.push(extendObject(entries[i]))
                } else {
                  console.log(res)
                }
              } else {
                console.log("CATCH ERROR FROM _exchangeNodeGet")
                console.log(e)
              }
              if (--self._exchangeNodeCount == 0) {
                if (self._exchangeNodes.length) {
                  self._propagateToActiveNodes(thisExchangeNode, self._exchangeNodes)
                } else {
                  console.log("ERROR! _exchangeNodes empty in _exchangeNodeGet!")
                  self._isBusy = false
                }
              }
            })
          }
        }
        if (self._exchangeNodeCount == 0) {
          console.log("ERROR! _exchangeNodes empty!")
          self._isBusy = false
        }
      } else {
        console.log("No ExchangeNode found to propagate")
        self._isBusy = false
      }
    })
}

module.exports._propagateToActiveNodes = function(thisNode, remoteNodes) {
  var self = this,
    clusterid = CommandLineHelpers.config.clusterid,
    chunk = []

  self._activeOperations = 0
  self._propagateStart = new Date()

  Hash.find()
    //.where({ downloaded: true, updatedAt: { '>=': thisNode.propagatedAt } })
    .where({ peersUpdatedAt: { '>=': thisNode.propagatedAt } })
    .exec(function(err, entries) {
      if (!err && entries.length) {
        for (var index in entries) {
          if (typeof entries[index]['updatedBy'] === "undefined" || entries[index]['updatedBy'] == clusterid) {

            chunk.push(entries[index])
            if (chunk.length == 25) {
              self._postToActiveNodes(thisNode, remoteNodes, JSON.stringify(chunk))
              chunk = []
            }
          }
        }
        if (chunk.length) {
          self._postToActiveNodes(thisNode, remoteNodes, JSON.stringify(chunk))
        }
      } else {
        console.log("Unexpected error in _propagateToActiveNodes.on('find'), entries.length: " + entries.length)
        console.log(err)
        self._isBusy = false
      }
    })
}

module.exports._postToActiveNodes = function(thisNode, remoteNodes, data) {
  var self = this

  for (var i in remoteNodes) {
    ++self._activeOperations
    self._exchangeNodeGet(thisNode, remoteNodes[i], 'merge', data, function exchangeNodePostCB(err, res) {
      if (--self._activeOperations == 0) {
        ExchangeNode.update({ uuid: thisNode.uuid }, {
          propagatedAt: self._propagateStart
        }, function (error, hashes) {
          console.log("\n[FINAL] error: " + Boolean(error) + ", result: " + JSON.stringify(hashes))
        })
        self._isBusy = false
      }
    })
  }
}

module.exports._exchangeNodeGet = function(thisNode, remoteNode, action, data, callback) {
  var self = this,
    exchangeKey = self._getExchangeKey(remoteNode.uuid, remoteNode.key, thisNode.uuid, thisNode.key, data.length),
    url = remoteNode.baseURL + action + '?uuid=' + thisNode.uuid + '&key=' + exchangeKey

  requestify.get(url, {
    params: {
      data: data
    }
  }).then(function(response) {
    response.getBody()
    try {
      callback(null, JSON.parse(response.body))
    } catch (e) {
      callback(e, response.body)
    }
  }, function(error) {
    callback(error)
  })
}

module.exports._getExchangeKey = function(rUUID, rKEY, sUUID, sKEY, len) {
  var crypto = require('crypto')
  return crypto.createHash('md5').update('' + rUUID + rKEY + sUUID + sKEY + len).digest("hex")
}

var extendObject = function (primary, secondary) {
  secondary = secondary || null
  var o = extend({}, primary)
  if (secondary != null) {
    extend(o, secondary)
  }
  return o
}
