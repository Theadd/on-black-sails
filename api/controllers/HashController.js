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

    Hash.count({}).exec(function countCB(err, found){
      if (err) return res.send(err,500);

      res.json({
        total: found
      });

    });

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

    query.exec(function searchCB(err, hashes){
      if (err) return res.send(err,500);

      res.json(hashes);

    });
  }

};
