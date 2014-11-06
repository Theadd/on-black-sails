
module.exports = function(req, res, next) {
  return (Entity.isMaster || Entity.isAPI) ? next() : res.forbidden('Access denied.')
}
