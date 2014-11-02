/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * Only applies to HTTP requests (not WebSockets)
 *
 * For more information on configuration, check out:
 * http://links.sailsjs.org/docs/config/http
 */

module.exports.http = {

  middleware: {

    // The order in which middleware should be run for HTTP request.
    // (the Sails router is invoked by the "router" middleware below.)
    order: [
      'startRequestTimer',
      'cookieParser',
      'session',
      'bodyParser',
      'handleBodyParserError',
      'compress',
      'methodOverride',
      'poweredBy',
      '$custom',
      'router',
      'www',
      'favicon',
      '404',
      '500'
    ]

    // The body parser that will handle incoming multipart HTTP requests.
    // By default as of v0.10, Sails uses [skipper](http://github.com/balderdashy/skipper).
    // See http://www.senchalabs.org/connect/multipart.html for other options.
    // bodyParser: require('skipper')

  },

  locals: {

    /** Helpers (Server side). Replica of /assets/js/helpers.js */
    Helpers: {

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

      pageTitle: function (page) {
        page = page.replace(/(\/[0-9]*)$/, '');

        switch (page) {
          case '/realm': return 'Public Nodes'; break;
          case '/agreement/new': return 'Agreement Request'; break;
          case '/agreement': return 'Agreements'; break;
          case '/settings': return 'Settings'; break;
          case '/linkedentity': return 'Cluster Processes'; break;
          case '/linkedentity/new': return 'New Process Entity'; break;
          case '/user': return 'Manage Users'; break;
          case '/user/show': return 'User Profile'; break;
          case '/user/new': return 'Sign Up'; break;
          case '/session/new': return 'Sign In'; break;
          default:
            if (page.indexOf('/linkedentity/edit') == 0) return 'Edit Process Entity'; break;
            break;
        }

        return 'Dashboard';
      },

      pageBreadcrumb: function (page) {
        page = page.replace(/(\/[0-9]*)$/, '');

        switch (page) {
          case '/realm':
            return [
              { title: 'Global Network', url: Settings.get('realm') },
              { title: 'Public Nodes', url: false }
            ];
            break;
          case '/agreement/new':
            return [
              { title: 'Global Network', url: Settings.get('realm') },
              { title: 'Public Nodes', url: '/realm' },
              { title: 'Agreement Request', url: false }
            ];
            break;
          case '/agreement':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Agreements', url: false }
            ];
            break;
          case '/settings':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Settings', url: false }
            ];
            break;
          case '/linkedentity':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Cluster Processes', url: false }
            ];
            break;
          case '/linkedentity/new':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Cluster Processes', url: '/linkedentity' },
              { title: 'New Process Entity', url: false }
            ];
            break;
          case '/user':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Manage Users', url: false }
            ];
            break;
          case '/user/show':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Manage Users', url: '/user' },
              { title: 'User Profile', url: false }
            ];
            break;
          case '/user/new':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Manage Users', url: '/user' },
              { title: 'Sign Up', url: false }
            ];
            break;
          case '/session/new':
            return [
              { title: 'Local Cluster', url: '/' },
              { title: 'Manage Users', url: '/user' },
              { title: 'Sign In', url: false }
            ];
            break;
          default:
            if (page.indexOf('/linkedentity/edit') == 0) {
              return [
                { title: 'Local Cluster', url: '/' },
                { title: 'Cluster Processes', url: '/linkedentity' },
                { title: 'Edit Process Entity', url: false }
              ];
            }
            break;
        }

        return [
          { title: 'Local Cluster', url: '/' },
          { title: 'Dashboard', url: false }
        ];
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
    }
  },
  // The number of seconds to cache flat files on disk being served by
  // Express static middleware (by default, these files are in `.tmp/public`)
  //
  // The HTTP static cache is only active in a 'production' environment,
  // since that's the only time Express will cache flat-files.
  cache: 31557600000
};
