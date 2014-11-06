
module.exports = function(req, res, next) {
  return (Entity.isAPI) ? next() : res.forbidden('Access denied.')
}
