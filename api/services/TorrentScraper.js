/**
 * Created by Theadd on 28/09/2014.
 */

var extend = require('util')._extend
var BittorrentTracker = require('bittorrent-tracker')
var _scrapeRequests = {}, _scrapeResponses = {}

module.exports = Scraper

function Scraper (hash, announce, opts, cb) {
  var self = this

  self._results = []
  self._hash = hash
  self._announce = (typeof announce === 'string') ? [ announce ] : announce
  self._opts = opts || {}
  self._opts = extend({
    interval: 800,
    getAll: false,
    maxRetries: 3
  }, opts)
  self._availableRetries = self._opts.maxRetries

  self._announce.forEach(function (url) {
    registerScrapeRequest(url)
    BittorrentTracker.scrape(url, self._hash, function(err, res) {
      if (!err) {
        registerScrapeResponse(url)
        self._results.push(res)
      }
    })
  })

  self._scraperTimeout = function () {
    var results = getReliablePeers(self._results)
    clearTimeout(self._timer)
    if ((results == false || self._results.length < Math.min(Math.ceil(self._announce.length / 2), 5)) && self._availableRetries > 0) {
      --self._availableRetries
      self._timer = setTimeout( self._scraperTimeout, self._opts.interval)
    } else {
      if (results != false) {
        results.retries = self._opts.maxRetries - self._availableRetries
        results.responses = self._results.length
        results.announces = self._announce.length
      }
      cb((results != false) ? null : new Error('No peers found'), (self._opts.getAll) ? self._results : results)
    }
  }

  self._timer = setTimeout( self._scraperTimeout, self._opts.interval)
}

var getReliablePeers = function (results) {
  var peers, index = -1

  for (var i in results) {
    if (index == -1) {
      peers = extend({}, results[i])
      index = i
      continue
    }
    if (results[i].complete > peers.complete) {
      peers = extend({}, results[i])
      index = i
    } else {
      if (results[i].complete == peers.complete) {
        if (results[i].downloaded > peers.downloaded) {
          peers = extend({}, results[i])
          index = i
        }
      }
    }
  }

  return (index != -1) ? peers : false
}

var registerScrapeRequest = function (url) {
  if (typeof _scrapeRequests[url] !== "undefined") {
    ++_scrapeRequests[url]
  } else {
    _scrapeRequests[url] = 1
  }
}

var registerScrapeResponse = function (url) {
  if (typeof _scrapeResponses[url] !== "undefined") {
    ++_scrapeResponses[url]
  } else {
    _scrapeResponses[url] = 1
  }
}

module.exports.getActivity = function () {
  return {requests: _scrapeRequests, responses: _scrapeResponses}
}