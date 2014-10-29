/**
 * MessageController
 *
 * @description :: Server-side logic for managing messages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  create: function(req, res, next) {
    var params = req.params.all()

    console.log("\n in message.create, raw params: ")
    console.log(params)
    delete params.id
    var data = Cluster.validate(params)
    if (data != false && data.url == Settings.get('realm')) {
      data = Common.RevertSanitizeRequestParameters(data)
      console.log("\nIN MESSAGE.CREATE, params: ")
      console.log(data)
      res.json({
        error: false,
        data: true
      })
      if (data.agreement && data.agreement.id) {
        process.nextTick(function() {
          Cluster.requestAndBuildAgreements()
        })
      }
    } else {
      console.error("\nIN MESSAGE.CREATE, ERROR!!! NOT PART OF THIS REALM!! WTF!")
      console.log(params)
      res.json({
        error: 'Not part of this realm.'
      })
    }
  }

};
