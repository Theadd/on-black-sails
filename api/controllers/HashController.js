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

    Hash.count({}).exec(function countCB(err,found){
      if (err) return res.send(err,500);

      res.json({
        total: found
      });

    });

  }

};

