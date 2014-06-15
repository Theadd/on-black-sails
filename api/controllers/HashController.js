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

  //Model.find({ class: { 'contains': 'history' }})
  //req.param('id')

  /**
   * HashController.search()
   */
  search: function (req, res) {

    /*Hash.find({ title: { 'contains': req.param('title') }}).exec(function searchCB(err, hashes){
      if (err) return res.send(err,500);

      res.json(hashes);

    });*/

    Hash.find().where({
      or: [
        {title: { contains: req.param('query') }},
        {category: { contains: req.param('query') }}
      ]
    }).exec(function searchCB(err, hashes){
      if (err) return res.send(err,500);

      res.json(hashes);

    });

  }

};

/*
 User.find()
 .where({
 or: [
 {username: { contains: req.body.search }},
 {email: { contains: req.body.search }},
 {firstName: { contains: firstName }},
 {lastName: { contains: lastName }},
 {firstName: {startsWith: firstName}, lastName: lastName}
 ]
 }).exec(...)
 */
