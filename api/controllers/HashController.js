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

      res.json(hashes);

    });
  },

  /**
   * HashController.movie()
   * @example: http://localhost:1337/hash/search?query=2014%20720%20|%201080&category=movie%20|%20tv
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
