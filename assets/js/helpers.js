
/** Helpers (Client side). Replicated in /config/http.js for server side. */
var Helpers = {

  formatBigNumber: function (num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num;
  },

  getAgreementFilterObject: function (name, param) {
    var obj = {
      display: 'Error',
      description: 'Unknown',
      icon: 'fa-exclamation-triangle'
    };

    switch (String(name).toLowerCase()) {
      case 'indexed':
        obj.description = 'Latest indexed torrents (w/o metadata).';
        obj.display = 'Indexed';
        obj.icon = 'fa-archive';
        break;
      case 'downloaded':
        obj.description = 'Latest downloaded torrents (w/ metadata).';
        obj.display = 'Downloaded';
        obj.icon = 'fa-code';
        break;
      case 'media':
        obj.description = 'Latest torrents with media info.';
        obj.display = 'Media';
        obj.icon = 'fa-film';
        break;
      case 'peers':
        obj.description = 'Latest torrents with updated peers.';
        obj.display = 'Peers';
        obj.icon = 'fa-child';
        break;
    }

    if (param || false) {
      return obj[param];
    } else {
      return obj;
    }
  },

  getStatusStyle: function (name) {
    switch (String(name).toLowerCase()) {
      case 'pending': return 'primary'; break;
      case 'accepted': return 'success'; break;
      case 'denied': return 'danger'; break;
      case 'cancelled': return 'danger'; break;
      case 'paused': return 'warning'; break;
      case 'deleted': return 'default'; break;
    }

    return 'fa-exclamation-triangle';
  }

};

