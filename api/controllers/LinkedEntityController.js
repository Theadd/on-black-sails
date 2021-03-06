/**
 * LinkedEntityController
 *
 * @description :: Server-side logic for managing linked entities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  'new': function(req, res) {

    var entity = new ControlledEntity({}),
      result = entity.getClonedValues()

    res.view({
      linkedentity: result
    })
  },

  create: function(req, res, next) {
    //if (req.session.User && req.session.User.admin) {
    var entity = new ControlledEntity({})

    if (entity) {
      for (var i in req.body) {
        if (i == '_csrf') continue
        entity.set(i, req.body[i])
      }
      entity.create(function (err, result) {
        if (err) {
          req.session.flash = {
            err: [{name: 'createError', message: err.message}]
          }
          return res.redirect('/linkedentity/new')
        } else {
          req.session.flash = {
            msg: [{name: 'createSuccess', message: '<span class="inline-pseudobox">' + result.name + '</span> was created successfully.'}]
          }
          return res.redirect('/linkedentity')
        }
      })
    } else {
      req.session.flash = {
        err: [{name: 'entityNotFound', message: 'Entity not found!'}]
      }
      return res.redirect('/linkedentity/new')
    }

  },

  index: function(req, res, next) {

    LinkedEntity.find(function foundLinkedEntities(err, entities) {
      if (err) return next(err)

      var result = [], i
      for (i in entities) {
        var entity = Entity.getControlledEntity(entities[i].id)

        if (entity) {
          result.push(entity.getClonedValues())
        }
      }
      res.view({
        linkedentities: result
      })
    })
  },

  edit: function(req, res, next) {
    LinkedEntity.findOne(req.param('id'), function foundLinkedEntities(err, entity) {
      if (err) return next(err)
      var result = {}
      try {
        result = Entity.getControlledEntity(entity.id).getClonedValues()
      } catch (e) {
        console.log(e)
        req.session.flash = {
          err: [{name: 'Error', message: e.message}]
        }
        return res.redirect('/linkedentity/new')
      }

      res.view({
        linkedentity: result
      })
    })
  },

  update: function(req, res, next) {
    //if (req.session.User && req.session.User.admin) {
    var entity = Entity.getControlledEntity(req.param('id')),
      button = req.param('button')

    if (entity) {

      if (button == 'update') {
        //set default value for multi selects
        console.log("IN entity update, localcluster: " + req.body['localcluster'])
        req.body.autoqueue = req.body.autoqueue || false
        req.body['metadata-onempty'] = req.body['metadata-onempty'] || false
        req.body['tracker-onempty'] = req.body['tracker-onempty'] || false
        req.body['status-onempty'] = req.body['status-onempty'] || false
        req.body['media-onempty'] = req.body['media-onempty'] || false

        for (var i in req.body) {
          if (i == '_csrf' || i == 'id' || i == 'button') continue
          entity.set(i, req.body[i])
        }
        entity.update(function (err, result) {
          if (err) {
            req.session.flash = {
              err: [
                {name: 'updateError', message: err.message}
              ]
            }
            return res.redirect('/linkedentity/edit/' + req.param('id'));
          } else {
            req.session.flash = {
              msg: [
                {name: 'restartNeeded', message: 'Restart <span class="inline-pseudobox">' + entity.get('name') + '</span> to apply changes.'}
              ]
            }
            return res.redirect('/linkedentity')
          }
        })
      } else if (button == 'delete') {
        entity.destroy(function (err) {
          if (err) {
            req.session.flash = {
              err: [
                {name: 'destroyError', message: err.message}
              ]
            }
            return res.redirect('/linkedentity/edit/' + req.param('id'));
          } else {
            req.session.flash = {
              msg: [
                {name: 'destroySuccess', message: 'Entity successfully deleted.'}
              ]
            }
            return res.redirect('/linkedentity')
          }
        })
      }
    } else {
      req.session.flash = {
        err: [{name: 'entityNotFound', message: 'Entity not found!'}]
      }
      return res.redirect('/linkedentity')
    }
  },

  destroy: function(req, res, next) {

  },

  subscribe: function(req, res) {
    LinkedEntity.find(function foundLinkedEntities(err, entities) {
      if (err) return next(err);

      LinkedEntity.watch(req.socket);

      LinkedEntity.subscribe(req.socket, entities);

      res.send(200);
    })
  },

  detail: function(req, res, next) {
    var id = req.param('id')

    LinkedEntity.findOne(id, function foundLinkedEntity(err, entity) {
      if (err) return next(err)
      var result = {}, controlled
      try {
        controlled = Entity.getControlledEntity(entity.id)
        result = controlled.getClonedValues()
      } catch (e) {
        console.log(e)
        req.session.flash = {
          err: [{name: 'Error', message: e.message}]
        }
        return res.redirect('/linkedentity')
      }

      res.view({
        linkedentity: result
      })
    })
  },

  stats: function(req, res, next) {
    var id = req.param('id')

    LinkedEntity.findOne(id, function foundLinkedEntity(err, entity) {
      if (err) return next(err)

      try {
        Entity.getControlledEntity(entity.id).get('stats')
      } catch (e) {
        res.json({
          error: e
        })
      }

      res.json({
        error: false
      })
    })
  },

  ///////////////////////////// ACTIONS ////////////////////////

  'toggle': function(req, res) {

    if (req.session.User && req.session.User.admin) {
      var entity = Entity.getControlledEntity(req.param('id')),
        prop = req.param('prop')

      if (entity) {
        entity.set(prop, !entity.get(prop))
        entity.updateToSlave(prop)
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
            entity.respawn(true)
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

