/**
 * SessionController
 *
 * @description :: Server-side logic for managing sessions
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var bcrypt = require('bcrypt');

module.exports = {
	'new': function(req, res) {
    res.view('session/new');
  },

  'create': function(req, res) {
    if (!req.param('email') || !req.param('password')) {
      var usernamePasswordRequiredError = [{name: 'usernamePasswordRequired', message: 'You must enter both a username and password.'}];

      req.session.flash = {
        err: usernamePasswordRequiredError
      };

      res.redirect('/session/new');
      return;
    }

    User.findOneByEmail(req.param('email')).exec(function(err, user) {
      if (err) return next(err);

      if (!user) {
        var noAccountError = [{name: 'noAccount', message: 'The email address ' + req.param('email') + ' not found.'}];
        req.session.flash = {
          err: noAccountError
        };

        res.redirect('/session/new');
        return;
      }

      bcrypt.compare(req.param('password'), user.encryptedPassword, function(err, valid) {
        if (err) return next(err);

        if (!valid) {
          var usernamePasswordMismatchError = [{name: 'usernamePasswordMismatch', message: 'Invalid username and password combination.'}];
          req.session.flash = {
            err: usernamePasswordMismatchError
          }
          res.redirect('/session/new')
          return
        }

        req.session.authenticated = true
        req.session.User = user

        user.online = true;
        user.save(function(err, user) {
          if (err) return next(err)

          User.publishUpdate(user.id, {
            loggedIn: true,
            id: user.id,
            name: user.name,
            action: ' has logged in.'
          })

          var redirectTo

          if (req.session.User.admin) {
            if (Settings.get('ready')) {
              if (req.session.redirectTo) {
                redirectTo = req.session.redirectTo
                delete req.session.redirectTo
                res.redirect(redirectTo)
              } else {
                res.redirect('/')
              }
            } else {
              res.redirect('/settings')
            }
          } else {
            if (req.session.redirectTo) {
              redirectTo = req.session.redirectTo
              delete req.session.redirectTo
              res.redirect(redirectTo)
            } else {
              res.redirect('/user/show/' + user.id)
            }
          }
        });
      });
    });
  },

  destroy: function(req, res, next) {
    User.findOne(req.session.User.id, function foundUsers(err, user) {
      var userId = req.session.User.id;

      if (user) {
        User.update(userId, {
          online: false
        }, function(err) {
          if (err) return next(err);

          User.publishUpdate(user.id, {
            loggedIn: false,
            id: user.id,
            name: user.name,
            action: ' has logged out.'
          });

          req.session.destroy();

          res.redirect('/session/new');
        });
      } else {
        req.session.destroy();

        res.redirect('/session/new');
      }
    });
  },

  sqm: function(req, res) {
    return res.json({
      error: false,
      data: (req.session.servicequeuemodels) ? req.session.servicequeuemodels : ServiceQueueModel.getListOfModels()
    })
  }
};
