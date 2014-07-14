/**
 * HashController
 *
 * @description :: Server-side logic for managing hashes
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  /**
   * HashController.count()
   */
  count: function (req, res) {
    var type = req.param('type') || 'all'

    if (type == 'all') {
      Hash.count({}).exec(function countCB(err, found){
        if (err) return res.send(err, 500)

        res.json({
          total: found
        })

      })
    } else if (type == 'movie') {
      Hash.count({
        downloaded: true,
        category: { contains: "movies" },
        status: {'>=': 0}
      }).exec(function countCB(err, found){
        if (err) return res.send(err, 500)

        res.json({
          total: found
        })

      })
    } else if (type == 'downloaded') {
      Hash.count({
        downloaded: true
      }).exec(function countCB(err, found){
        if (err) return res.send(err, 500)

        res.json({
          total: found
        })

      })
    }else {
      res.send("Unknown type " + type, 500)
    }

  },

  /**
   * HashController.search()
   * @example: http://localhost:1337/hash/search?query=2014%20720%20|%201080&category=movie%20|%20tv
   */
  search: function (req, res) {
    var i,
      query = Hash.find(),
      queries = QueryHelpers.getWaterlineQueryFromString(req.param('query'), 'title'),
      categories = (typeof req.param('category') !== "undefined" && req.param('category').length) ? QueryHelpers.getWaterlineQueryFromString(req.param('category'), 'category') : []

    for (i = 0; i < queries.length; ++i) {
      query = query.where(queries[i])
    }
    for (i = 0; i < categories.length; ++i) {
      query = query.where(categories[i])
    }

    query = query.paginate()

    query.exec(function searchCB(err, hashes){
      if (err) return res.send(err,500);

      if (typeof req.param('define') !== "undefined" && req.param('define').length) {

        var extend = require('util')._extend
        var safeEval = (function(input) {
          'use strict'
          return eval(input)
        })

        for (i = 0; i < hashes.length; ++i) {
          var item = extend({}, hashes[i])

          var snippet = req.param('define')
          snippet = snippet.replace(/\$item\.uuid/g, hashes[i]['uuid'])
            .replace(/\$item\.cache/g, hashes[i]['cache'] || '')
            .replace(/\$item\.title/g, hashes[i]['title'] || '')
            .replace(/\$item\.added/g, hashes[i]['added'] || '')
            .replace(/\$item\.updatedAt/g, hashes[i]['updatedAt'] || '')
            .replace(/\$item\.createdAt/g, hashes[i]['createdAt'] || '')
            .replace(/\$item\.rate/g, hashes[i]['rate'] || '0')
            .replace(/\$item\.media/g, JSON.stringify(hashes[i]['media']) || '{}')
            .replace(/\$item\.status/g, hashes[i]['status'] || '0')
            .replace(/\$item\.leechers/g, hashes[i]['leechers'] || '0')
            .replace(/\$item\.seeders/g, hashes[i]['seeders'] || '0')
            .replace(/\$item\.size/g, hashes[i]['size'] || '0')
            .replace(/\$item\.downloaded/g, hashes[i]['downloaded'] || 'false')
            .replace(/\$item\.files/g, hashes[i]['files'] || '0')
            .replace(/\$item\.trackers/g, JSON.stringify(hashes[i]['trackers']) || '0')
            .replace(/\$item\.source/g, hashes[i]['source'] || '')
            .replace(/\$item\.category/g, hashes[i]['category'] || '')

          var aux = "var json = " + snippet + "; json"
          try {
            var evaluated = safeEval(aux)

            extend(item, evaluated)
            hashes[i] = item
          } catch (e) {
            console.log(e);
            hashes[i] = { 'error': true, 'snippet': snippet, 'eval': aux }
          }
          /*
           {link:%20(%27$item.cache%27.length)%20?%20%27http://$item.cache/torrent/$item.uuid.torrent%27%20:%20%27magnet:?xt=urn:btih:%27%20%2B%20%27$item.uuid%27.toLowerCase()%20%2B%20%27%26dn=%27%20%2B%20encodeURIComponent(%27$item.title%27)%20}
           {link: ('$item.cache'.length) ? 'http://$item.cache/torrent/$item.uuid.torrent' : 'magnet:?xt=urn:btih:' + '$item.uuid'.toLowerCase() + '&dn=' + encodeURI('$item.title') }
           text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
           */
        }
      }

      res.json(hashes);

    });
  },

  /**
   * HashController.movie()
   */
  movie: function (req, res) {

    var MovieDB = require('moviedb')('d64e9dd43d0bc3187bb0254ccfe01257')
    if (typeof req.param('query') !== "undefined") {
      MovieDB.searchMovie({query: req.param('query') }, function(err, mdbres){
        console.log(mdbres);
        if (err) return res.send(err,500);

        res.json(mdbres);
      })
    } else if (typeof req.param('id') !== "undefined") {
      MovieDB.movieInfo({id: req.param('id') }, function(err, mdbres){
        console.log(mdbres);
        if (err) return res.send(err,500);

        res.json(mdbres);
      })
    }

  }

};
