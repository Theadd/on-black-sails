module.exports = function(req, res, ok) {

  if (req.session.User && req.session.User.admin) {
    if (Settings.get('ready') || req.url.indexOf('/settings') != -1) {
      return ok()
    } else {
      req.session.flash = {
        err: [{name: 'properSettingsRequired', message: 'Proper settings required to perform this action.'}]
      }
      return res.redirect('/settings')
    }
  }

  else {
    req.session.redirectTo = req.url

    var requireAdminError = [{name: 'requireAdminError', message: 'You must be an admin.'}]
    req.session.flash = {
      err: requireAdminError
    }
    return res.redirect('/session/new')
  }

}