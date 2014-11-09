io.socket.on('connect', function() {
  var page = (document.location.pathname).replace(/(\/)$/, '');

  switch (page) {
    case '/user':
      io.socket.on('user', handleServerMessage);
      io.socket.get('/user/subscribe');
      break;
    case '/linkedentity':
      io.socket.on('linkedentity', handleServerMessage);
      io.socket.get('/linkedentity/subscribe');
      break;
    case '/agreement':
      io.socket.on('agreement', handleServerMessage);
      io.socket.get('/agreement/subscribe');
      break;
    default:
      if (page.indexOf('/linkedentity/detail/') != -1) {
        io.socket.on('linkedentity', handleServerMessage);
        io.socket.get('/linkedentity/subscribe');
      }
      break;
  }

});

function handleServerMessage(message) {
  console.debug(message);

  updateEntryInDom(message);

  if (message.verb !== 'destroyed') {
    $('#chatAudio')[0].play();
  }
}

function updateEntryInDom(message) {
  var page = document.location.pathname;

  page = page.replace(/(\/)$/, '');

  var id = message.id;

  switch (page) {
    case '/user':
      if (message.verb === 'updated') {
        UserIndexPage.updateUser(id, message);
      }

      if (message.verb === 'created') {
        UserIndexPage.addUser(message);
      }

      if (message.verb === 'destroyed') {
        UserIndexPage.destroyUser(id);
      }
      break;
    case '/linkedentity':
      if (message.verb === 'updated') {
        LinkedEntityIndexPage.updateLinkedEntity(id, message);
      }
      if (message.verb === 'created') {
        LinkedEntityIndexPage.addLinkedEntity(id, message);
      }
      break;
    case '/agreement':
      if (message.verb === 'updated') {
        AgreementIndexPage.updateAgreement(id, message);
      }
      if (message.verb === 'created') {
        AgreementIndexPage.addAgreement(message);
      }
      break;
    default:
      if (page.indexOf('/linkedentity/detail/') != -1) {
        if (message.data.property == 'stats') {
          LinkedEntityIndexPage.updateLinkedEntity(id, message);
        }
      }
      break;
  }
}
