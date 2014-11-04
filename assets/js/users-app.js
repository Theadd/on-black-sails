
var UserIndexPage = {

  updateUser: function(id, message) {
    var $userRow = $('tr[data-id="' + id + '"] td img').first();

    if (message.data.loggedIn) {
      $userRow.attr('src', '/images/icon-online.png');
    } else {
      $userRow.attr('src', '/images/icon-offline.png');
    }
  },

  addUser: function(user) {
    var obj = {
      user: user.data,
      _csrf: window.overlord.csrf || ''
    };

    $('tr:last').after(
      JST['assets/templates/addUser.ejs'](obj)
    );
  },

  destroyUser: function(id) {
    $('tr[data-id="' + id + '"]').remove();
  }
};
