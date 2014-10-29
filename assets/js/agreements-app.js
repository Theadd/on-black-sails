/**
 * Created by Theadd on 29/10/2014.
 */

var AgreementIndexPage = {

  updateAgreement: function(id, message) {
    var prop = message.data.property;
    console.log("updateAgreement, prop: " + prop)

  },

  addAgreement: function(message) {
    var obj = {
      agreement: message.data.value
    };

    $('.dashboard-agreement-list').prepend(
      JST['assets/templates/addAgreement.ejs'](obj)
    );
  }

};
