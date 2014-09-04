/**
 * Created by Theadd on 9/4/14.
 */

var requestify = require('requestify')
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

    self._isBusy = false; //TODO: We're not done here yet!
  }
}

module.exports._propagate = function(err, thisExchangeNode) {
  var self = this

  ExchangeNode.find()
    .where({ enabled: true })
    .exec(function(err, entries) {
      if (!err && entries.length) {
        for (var i in entries) {
          if (entries[i].uuid != thisExchangeNode.uuid) {
            self._exchangeNodeGet(thisExchangeNode, entries[i], 'active', function activeNodeCB(e, res) {
              if (!e) {
                console.log(JSON.stringify(res))
              } else {
                console.log(e);
              }
            })
          }
        }
      } else {
        console.log("No ExchangeNode found to propagate")
      }
    })
}

module.exports._exchangeNodeGet = function(thisNode, remoteNode, action, callback) {
  var self = this,
    exchangeKey = self._getExchangeKey(remoteNode.uuid, remoteNode.key, thisNode.uuid, thisNode.key, 0),
    url = remoteNode.baseURL + action + '?uuid=' + thisNode.uuid + '&key=' + exchangeKey

  requestify.get(url).then(function(response) {
    response.getBody()
    callback(null, response.body)
  }, function(error) {
    callback(error)
  })
}

module.exports._getExchangeKey = function(rUUID, rKEY, sUUID, sKEY, len) {
  var crypto = require('crypto')
  return crypto.createHash('md5').update('' + rUUID + rKEY + sUUID + sKEY + len).digest("hex")
}
