/**
 * SettingsController
 *
 * @description :: Server-side logic for managing settings
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  index: function(req, res, next) {
    var settingsObject = Settings.get(),
      settings = []

    Object.keys(settingsObject).forEach(function(key) {
      settings.unshift(settingsObject[key])
    })
    res.view({
      settings: settings
    })
  },

  update: function(req, res, next) {
    if (req.session.User && req.session.User.admin) {
      for (var i in req.body) {
        if (i == '_csrf') continue
        Settings.set(i, req.body[i])
      }
      Cluster.register(function (err) {
        if (err) {
          req.session.flash = {
            err: [
              {name: 'registerClusterInRealmError', message: err.message}
            ]
          }
          return res.redirect('/settings')
        } else {
          Settings.save(function (err) {
            if (err) {
              req.session.flash = {
                err: [
                  {name: 'saveSettingsError', message: err.message}
                ]
              }
            } else {
              req.session.flash = {
                msg: [
                  {name: 'restartNeeded', message: 'Restart this MASTER process to apply changes WITHOUT \'--port=*\'.'}
                ]
              }
            }
            return res.redirect('/settings')
          })
        }
      })
    } else {
      req.session.flash = {
        err: [{name: 'notEnoughPrivileges', message: 'Not enough privileges to perform this action.'}]
      }
      return res.redirect('/settings')
    }

  }

};

