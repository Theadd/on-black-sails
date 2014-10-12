/**
 * LinkedEntityController
 *
 * @description :: Server-side logic for managing linked entities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  'new': function(req, res) {
    res.view();
  },

  create: function(req, res, next) {
    /*var userObj = {
      name: req.param('name'),
      title: req.param('title'),
      email: req.param('email'),
      password: req.param('password'),
      confirmation: req.param('confirmation')
    };

    User.count({}, function (err, numUsers) {
      userObj['admin'] = Boolean(err || !numUsers)

      User.create(userObj, function userCreated(err, user) {
        if (err) {
          req.session.flash = {
            err: err
          };

          return res.redirect('/user/new');
        }

        req.session.authenticated = true;
        req.session.User = user;

        user.online = true;
        user.save(function(err, user) {
          if (err) return next(err);

          user.action = " signed-up and logged-in.";

          User.publishCreate(user);

          res.redirect('/user/show/'+user.id);
        });
      });
    })*/

  },

  show: function(req, res, next) {
    LinkedEntity.findOne(req.param('id'), function foundLinkedEntity(err, entity) {
      if (err) return next(err);
      if (!entity) return next();
      res.view({
        linkedentity: entity
      });
    });
  },

  index: function(req, res, next) {
    LinkedEntity.find(function foundLinkedEntities(err, entities) {
      if (err) return next(err)

      var result = [], i
      for (i in entities) {
        try {
          result.push(Entity.getControlledEntity(entities[i].id).getClonedValues())
        } catch (e) {
          console.log(e)
        }
      }
      res.view({
        linkedentities: result
      })
    })
  },

  edit: function(req, res, next) {
    /*User.findOne(req.param('id'), function foundUser(err, user) {
      if (err) return next(err);
      if (!user) return next();

      res.view({
        user: user
      })
    })*/
  },

  update: function(req, res, next) {
    /*var userObj = {
      name: req.param('name'),
      title: req.param('title'),
      email: req.param('email')
    };

    if (req.session.User.admin) {
      // Changed this logic to here. I prefer to send clean stuff to models
      var admin = false;
      var adminParam = req.param('admin');

      if (typeof adminParam !== 'undefined') {
        if (adminParam === 'unchecked') {
          admin = false;
        } else  if (adminParam[1] === 'on') {
          admin = true;
        }
      }
      userObj.admin = admin;
    }

    User.update(req.param('id'), userObj, function userUpdated (err) {
      if (err) {
        return res.redirect('/user/edit/' + req.param('id'));
      }

      res.redirect('/user/show/' + req.param('id'));
    });*/
  },

  destroy: function(req, res, next) {
    /*User.findOne(req.param('id'), function foundUser(err, user) {
      if (err) return next(err);
      if (!user) return next('User doesn\'t exist.');

      User.destroy(req.param('id'), function userDestroyed(err) {
        if (err) return next(err);

        User.publishUpdate(user.id, {
          name: user.name,
          action: ' has been destroyed.'
        });

        User.publishDestroy(user.id);
      });

      res.redirect('/user');
    });*/
  },

  subscribe: function(req, res) {
    LinkedEntity.find(function foundLinkedEntities(err, entities) {
      if (err) return next(err);

      LinkedEntity.watch(req.socket);

      LinkedEntity.subscribe(req.socket, entities);

      res.send(200);
    })
  },

  ///////////////////////////// ACTIONS ////////////////////////

  'toggle': function(req, res) {

    if (req.session.User && req.session.User.admin) {
      var entity = Entity.getControlledEntity(req.param('id')),
        prop = req.param('prop')

      if (entity) {
        entity.set(prop, !entity.get(prop))
      }
    }
    res.json({
      error: false
    })
  },

  'command': function(req, res) {

    if (req.session.User && req.session.User.admin) {
      var entity = Entity.getControlledEntity(req.param('id')),
        prop = req.param('prop')

      if (entity) {
        switch (prop) {
          case 'run':
            entity.setRespawnByForce(true)
            Entity._spawnChildProcessQueue.push(req.param('id'))
            Entity.spawnNextChildProcess()
            break
          case 'kill':
            entity.send('kill')
            break
        }
      }
    }
    res.json({
      error: false
    })
  }

};
