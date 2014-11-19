
module.exports = function(req, res, next) {
  return (Entity.isMaster) ? next() : res.forbidden('Access denied on this address.')
}
