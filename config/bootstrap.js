/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://links.sailsjs.org/docs/config/bootstrap
 */

module.exports.bootstrap = function(cb) {

  _.extend(sails.hooks.http.app.locals, sails.config.http.locals)

  Entity.deploy()

  if (Entity.isMaster) {
    User.update({}, {
        online: false
      },
      function userUpdated(err, users) {
        if (err) console.error(err)

        /*Hash.update({}, {
          updatedBy: Settings.get('cluster')
        }, function (uErr, hashes) {
          if (uErr) {
            sails.log.error(uErr)
          }
          cb()
        })*/

        LocalCluster.getMaster(function (err, master) {
          if (!err && !!master) {
            LinkedEntity.update({localcluster: null}, {
              localcluster: master.id
            }, function (err, entries) {
              if (err) {
                sails.log.error(err)
              }
              console.log(entries)
              cb()
            })
          } else cb()
        })



        //cb()
      }
    )
  } else {
    cb()
  }

}
