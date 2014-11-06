
module.exports = function(req, res, next) {
  return (Entity.isPublic) ? next() : res.forbidden('Access denied.')
}
