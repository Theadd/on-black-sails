/**
 * Created by Theadd on 29/10/2014.
 */

var AgreementIndexPage = {

  updateAgreement: function(id, message) {
    var obj = {
      agreement: message.data.value
    };

    $('.dashboard-agreement-list .item[data-id="' + id + '"]').replaceWith(
      JST['assets/templates/addAgreement.ejs'](obj)
    );
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
