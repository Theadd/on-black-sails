/**
 * SettingsController
 *
 * @description :: Server-side logic for managing settings
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var extend = require('node.extend');

module.exports = {
  index: function(req, res) {
    var settingsObject = Settings.get(),
      categoriesObject = Settings.getCategories(),
      settings = [],
      categories = []

    Object.keys(settingsObject).forEach(function(key) {
      settings.unshift(settingsObject[key])
    })

    Object.keys(categoriesObject).forEach(function(key) {
      categories.unshift(categoriesObject[key])
    })

    res.view({
      settings: settings,
      categories: categories
    })
  },

  update: function(req, res, next) {

    var settingsObject = Settings.get(),
      params = extend(true, {}, req.body)

    Object.keys(settingsObject).forEach(function(key) {
      if (settingsObject[key].type == "boolean") {
        if (typeof params[key] === "undefined") {
          params[key] = false
        }
      }
    })

    for (var i in params) {
      if (i == '_csrf') continue
      Settings.set(i, params[i])
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
            var message = ''
            if (Settings.get('autogc')) {
              message = 'Restart MASTER process WITHOUT \'--port=*\' to apply changes. Using forever with autogc \
                enabled would be: <span class="inline-pseudobox">forever start -c "node --expose-gc" app.js --master</span>'
            } else {
              message = 'Restart MASTER process WITHOUT \'--port=*\' to apply changes. Using forever with autogc \
                disabled would be: <span class="inline-pseudobox">forever start app.js --master</span>'
            }
            req.session.flash = {
              msg: [
                {name: 'restartNeeded', message: message}
              ]
            }
          }
          return res.redirect('/settings')
        })
      }
    })

  }

};

