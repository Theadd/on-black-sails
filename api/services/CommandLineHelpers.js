/**
 * Created by Theadd on 7/13/14.
 */

exports.usage = function () {
  return "\n  Usage: sails lift [options]\n       forever start app.js [options]\n\n\
  Options syntax:\n\t[--full-index] [--update-index] [--update-metadata[=number]]\n\t[--update-status[=number] [--update-media[=number]]] [--quiet]\n\t[--port=number] [--verbose]\n\n\
  Options:\n\
  \t--full-index\n\
  \t\tIndexes all torrents from bitsnoop.com and kickass.to\n\t\tThis should only be set the first time or after a downtime\n\t\tbigger than an hour.\n\n\
  \t--update-index\n\
  \t\tPeriodically indexes latest torrents from bitsnoop.com and\n\t\tkickass.to\n\n\
  \t--update-metadata[=number]\n\
  \t\tIndexes metadata of *.torrent files by downloading them from\n\t\tpublic torrent cache sites like torcache.net or torrage.com\n\
  \t\t* The interval between requests, in milliseconds, is optional\n\t\t  and defaults to 250ms.\n\n\
  \t--update-status[=number]\n\
  \t\tUpdates fake status of indexed torrents and peers information\n\t\tfrom announce trackers.\n\
  \t\t* The interval between requests, in milliseconds, is optional\n\t\t  and defaults to 335ms.\n\n\
  \t--update-media[=number]\n\
  \t\tUpdates media related information such as the IMDB ID or the\n\t\taverage rate.\n\
  \t\t* The interval between requests, in milliseconds, is optional\n\t\t  and defaults to 500ms.\n\n\
  \t\t\033[36mNote:\033[0m Should be used in conjunction with --update-status\n\n";
}

exports.getValues = function() {
  return {
    'full-index': Boolean(sails.config['full-index']),
    'full-index-kickass': (!(typeof sails.config['full-index'] === 'string' && sails.config['full-index'] == 'bitsnoop')),
    'full-index-bitsnoop': (!(typeof sails.config['full-index'] === 'string' && sails.config['full-index'] == 'kickass')),
    'update-index': Boolean(sails.config['update-index']),
    'update-metadata': Boolean(sails.config['update-metadata']),
    'update-metadata-interval': (typeof sails.config['update-metadata'] === 'number') ? sails.config['update-metadata'] : 250,
    'update-status': Boolean(sails.config['update-status']),
    'update-status-interval': (typeof sails.config['update-status'] === 'number') ? sails.config['update-status'] : 335,
    'update-media': Boolean(sails.config['update-media']),
    'update-media-interval': (typeof sails.config['update-media'] === 'number') ? sails.config['update-media'] : 500,
    'quiet': Boolean(sails.config['quiet']),
    'verbose': Boolean(sails.config['verbose']),
    'tracker': Boolean(sails.config['tracker']),
    'live': Boolean(sails.config['live']),
    'output-handler': Boolean(sails.config['output-handler'])
  }
}