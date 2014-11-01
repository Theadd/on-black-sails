/**
 * Created by Theadd on 29/10/2014.
 */

var AgreementIndexPage = {

  updateAgreement: function (id, message) {

    io.socket.get('/session/sqm', function (response) {

      var obj = {
        agreement: message.data.value,
        servicequeuemodels: response.data
      };

      $('.dashboard-agreement-list .item[data-id="' + id + '"]').replaceWith(
        JST['assets/templates/addAgreement.ejs'](obj)
      );

    });
  },

  addAgreement: function (message) {

    io.socket.get('/session/sqm', function (response) {

      var obj = {
        agreement: message.data.value,
        servicequeuemodels: response.data
      };

      $('.dashboard-agreement-list').prepend(
        JST['assets/templates/addAgreement.ejs'](obj)
      );

    });

  }

};
