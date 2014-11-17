module.exports = function(req, res, next) {
  res.locals.localclusters = {}

  if (!req.session.localclusters) {
    LocalCluster.find({}, function (err, localclusters) {
      req.session.localclusters = localclusters
      res.locals.localclusters = _.clone(req.session.localclusters)

      next();
    })

  } else {
    res.locals.localclusters = _.clone(req.session.localclusters)

    next();
  }
}
