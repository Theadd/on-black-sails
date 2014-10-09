$(document).ready(function() {
  $('#sign-up-form').validate({
    rules: {
      name: {
        required: true,
        minlength: 3,
        maxlength: 25

      },
      email: {
        required: true,
        email: true
      },
      title: {
        required: false,
        maxlength: 128
      },
      password: {
        required: true,
        minlength: 6,
        maxlength: 512
      },
      confirmation: {
        minlength: 6,
        equalTo: "#password"
      }
    },
    errorClass: "error help-block"
    /*success: function(element) {
      element.text('OK!').addClass('valid');
    }*/
  });
});