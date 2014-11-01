module.exports = function(req, res, next) {
  res.locals.servicequeuemodels = {};

  if (!req.session.servicequeuemodels) {
    req.session.servicequeuemodels = ServiceQueueModel.getListOfModels()
  }

  res.locals.servicequeuemodels = _.clone(req.session.servicequeuemodels);

  next();
};