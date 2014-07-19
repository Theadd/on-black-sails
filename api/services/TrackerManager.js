/**
 * Created by Theadd on 7/19/14.
 */

var TrackerClient = require('bittorrent-tracker')

var totalResponses = 0,
  rawAnnounceItem = {'requests': 0, 'responses': 0, 'timeouts': 0, 'last-request': new Date().getTime()/*, 'active': false*/}

var announce = exports.announce = []

var getProperAnnounceUrls = exports.getProperAnnounceUrls = function (trackers) {
  var announceUrls = [],
    properFound = false

  if (totalResponses > 100) {
    //console.log("\tSEARCHING FOR CANDIDATE")
    var candidate = null,
      candidateUrl = ''

    for (var i in trackers) {
      if (typeof announce[trackers[i]] !== "undefined") {
        var item = announce[trackers[i]]
        if (!item['active']) {
          if (candidate == null || candidate['last-request'] < item['last-request']) {
            candidate = item
            candidateUrl = trackers[i]
          }
        } else {
          //check for timeouts: 15s if there was  no previous timeout, 30s for second timeout, 45s for third, etc.
          if ((new Date().getTime()) - item['last-request'] > (15000 * (item['timeouts'] + 1))) {
            //console.log("\t\tTIMEOUT DETECTED FOR "+trackers[i])
            announce[trackers[i]]['timeouts']++
            announce[trackers[i]]['active'] = false
            if (candidate == null || candidate['last-request'] < item['last-request']) {
              candidate = item
              candidateUrl = trackers[i]
            }
          }
        }
      }
    }
    if (candidate != null) {
      //console.log("\t\tCANDIDATE FOUND! " + candidateUrl)
      properFound = true
      announceUrls.push(candidateUrl)
      announce[candidateUrl]['active'] = true
      announce[candidateUrl]['requests']++
      announce[candidateUrl]['last-request'] = new Date.getTime()
    }
  }

  if (!properFound) {
    //if (totalResponses > 100) console.log("\t############ NO CANDIDATE FOUND!")
    for (var i in trackers) {
      if (trackers[i].indexOf('dht://') == -1) {
        /*TODO: REMOVE */ //if (trackers[i] == 'udp://open.demonii.com:1337/announce') console.log("i")
        announceUrls.push(trackers[i])
      }
    }
    //console.log("-")
  }

  return announceUrls
}

var registerAnnounceResponse = exports.registerAnnounceResponse = function (url) {
  var item = announce[url] || JSON.parse(JSON.stringify(rawAnnounceItem))
  item['active'] = false
  item['responses']++
  item['last-response'] = new Date().getTime()
  if (totalResponses <= 100) {
    item['requests'] = item['responses']
    item['last-request'] = item['last-response']
  }

  announce[url] = item
  ++totalResponses

  //console.log("RESPONSE FROM " + url)
}

function ignore(err) {
  //console.log("ERROR: " + err.message);
}

exports.updateTrackersFromHash = function(hash) {

  Indexer.workers['update-tracker']++
  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        var peerId = new Buffer('01234567890123456789'),
          port = 6881,
          data = { announce: getProperAnnounceUrls(entries[0].trackers), infoHash: entries[0].uuid };

        if (data.announce.length) {
          var client = new TrackerClient(peerId, port, data);
          client.on('error', ignore)
          client.once('update', function (data) {
            registerAnnounceResponse(data.announce)
            Hash.update({ uuid: entries[0].uuid },{ seeders: data.complete, leechers: data.incomplete }, function(err, hashes) {
              Indexer.workers['update-tracker']--
            })
          })
          client.update()
        } else {
          Indexer.workers['update-tracker']--
        }
      }
    });
}