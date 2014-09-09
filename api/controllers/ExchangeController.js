/**
 * ExchangeController
 *
 * @description :: Server-side logic for managing exchanges
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  /**
   * ExchangeController.active()
   */
  active: function (req, res) {
    var remoteUUID = req.param('uuid') || null,
      exchangeKey = req.param('key') || null,
      exchangeData = req.param('data') || ''

    if (remoteUUID != null && exchangeKey != null) {
      getExchangeNode(remoteUUID, function exchangeNodeCB(err, exchangeNode) {
        if (!err) {
          getExchangeNode(CommandLineHelpers.config.clusterid, function thisNodeCB(err, thisNode) {
            try {
              if (!err) {
                if (exchangeKey == getExchangeKey(thisNode.uuid, thisNode.key, exchangeNode.uuid, exchangeNode.key, exchangeData.length)) {
                  //authenticated
                  if (thisNode.enabled) {
                    res.json({
                      active: true
                    })
                  } else {
                    res.json({
                      active: false,
                      error: 'Node not enabled'
                    })
                  }
                } else {
                  res.json({
                    active: false,
                    error: 'Invalid exchange key'
                  })
                }
              } else {
                res.json({
                  active: false,
                  error: err
                })
              }
            } catch (error) {
              res.json({
                active: false,
                error: error
              })
            }
          })
        } else {
          res.json({
            active: false,
            error: err
          })
        }
      })
    } else {
      res.json({
        active: false,
        error: 'Missing parameters'
      })
    }

  },

  /**
   * ExchangeController.merge()
   */
  merge: function (req, res) {
    var remoteUUID = req.param('uuid') || null,
      exchangeKey = req.param('key') || null,
      exchangeData = req.param('data') || ''

    if (remoteUUID != null && exchangeKey != null) {
      getExchangeNode(remoteUUID, function exchangeNodeCB(err, exchangeNode) {
        if (!err) {
          getExchangeNode(CommandLineHelpers.config.clusterid, function thisNodeCB(err, thisNode) {
            try {
              if (!err) {
                if (exchangeKey == getExchangeKey(thisNode.uuid, thisNode.key, exchangeNode.uuid, exchangeNode.key, exchangeData.length)) {
                  //authenticated
                  if (thisNode.enabled) {
                    console.log("\t\tGOT DATA TO MERGE, LENGTH: "+exchangeData.length)
                    var error = false,
                      success = true,
                      data = null

                    try {
                      data = JSON.parse(exchangeData)
                    } catch (e) {
                      error = e
                      success = false
                    }
                    res.json({
                      error: error,
                      success: success
                    })
                    if (success) {
                      for (var i in data) {
                        console.log("\t\t[MERGE] data["+i+"].uuid: " + data[i].uuid)
                        //TODO: Merge
                      }
                    }
                  } else {
                    res.json({
                      active: false,
                      error: 'Node not enabled'
                    })
                  }
                } else {
                  res.json({
                    active: false,
                    error: 'Invalid exchange key'
                  })
                }
              } else {
                res.json({
                  active: false,
                  error: err
                })
              }
            } catch (error) {
              res.json({
                active: false,
                error: error
              })
            }
          })
        } else {
          res.json({
            active: false,
            error: err
          })
        }
      })
    } else {
      res.json({
        active: false,
        error: 'Missing parameters'
      })
    }

  },

  /**
   * ExchangeController.set()
   */
  set: function (req, res) {
    //TODO: Security|Authentication
    var uuid = req.param('uuid') || null,
      key = req.param('key') || null,
      baseURL = req.param('baseURL') || '',
      enabled = req.param('enabled') || true

    if (uuid != null && key != null && baseURL.length) {
      var data = {
        uuid: Number(uuid),
        baseURL: baseURL, //'http://127.0.0.1:1337/exchange/',
        key: key, //'key1337',
        enabled: Boolean(enabled)
      }
      //TODO: Create or Update if exists
      ExchangeNode.create(data).exec(function(err, entry) {
        if (!err) {
          res.json({
            success: true,
            error: false
          })
        } else {
          res.json({
            success: false,
            error: 'Error on ExchangeNode.create'
          })
        }
      })
    } else {
      res.json({
        success: false,
        error: 'Missing parameters'
      })
    }
  }

};

function getExchangeKey (rUUID, rKEY, sUUID, sKEY, len) {
  var crypto = require('crypto')
  return crypto.createHash('md5').update('' + rUUID + rKEY + sUUID + sKEY + len).digest("hex")
}

function getExchangeNode (uuid, callback) {
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
