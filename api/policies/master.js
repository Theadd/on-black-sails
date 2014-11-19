
module.exports = function(req, res, next) {
  return (Entity.isMaster && !Entity.isSlave) ? next() : res.forbidden('Access denied on this address.')
}
