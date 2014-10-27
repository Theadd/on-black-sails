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
    ],

    // The body parser that will handle incoming multipart HTTP requests.
    // By default as of v0.10, Sails uses [skipper](http://github.com/balderdashy/skipper).
    // See http://www.senchalabs.org/connect/multipart.html for other options.
    // bodyParser: require('skipper')

  },

  locals: {
    filters: {
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

      getAgreementFilterIcon: function (name) {
        switch (String(name).toLowerCase()) {
          case 'indexed': return 'fa-archive'; break;
          case 'downloaded': return 'fa-code'; break;
          case 'media': return 'fa-film'; break;
          case 'peers': return 'fa-child'; break;
        }

        return 'fa-exclamation-triangle';
      },

      getAgreementFilterDisplay: function (name) {
        switch (String(name).toLowerCase()) {
          case 'indexed': return 'Indexed'; break;
          case 'downloaded': return 'Downloaded'; break;
          case 'media': return 'Media'; break;
          case 'peers': return 'Peers'; break;
        }

        return 'fa-exclamation-triangle';
      },

      getAgreementFilterDescription: function (name) {
        switch (String(name).toLowerCase()) {
          case 'indexed': return 'Latest indexed torrents (w/o metadata).'; break;
          case 'downloaded': return 'Latest downloaded torrents (w/ metadata).'; break;
          case 'media': return 'Latest torrents with media info.'; break;
          case 'peers': return 'Latest torrents with updated peers.'; break;
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
