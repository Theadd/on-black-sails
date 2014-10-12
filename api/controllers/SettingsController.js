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

  }

};

