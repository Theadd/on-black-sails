/**
 * Created by Theadd on 7/13/14.
 */

var extend = require('util')._extend

var sailsDefaultConfigKeys = [ 'blueprints',
  'bootstrap',
  'connections',
  'cors',
  'csrf',
  'globals',
  'http',
  'i18n',
  'port',
  'environment',
  'log',
  'models',
  'policies',
  'routes',
  'session',
  'sockets',
  'views',
  'hooks',
  'appPath',
  'paths',
  'middleware',
  'rootPath',
  'sailsPackageJSON',
  'generators',
  'config',
  '_',
  'ssl',
  'cache',
  'express',
  'platform' ]

var defaultConfig = {
  'index': {
    'kickass': {
      'active': false,
      'full': false
    },
    'bitsnoop': {
      'active': false,
      'full': false
    }
  },
  'metadata': {
    'active': false,
    'interval': 250,
    'retry': 5000,
    'silent': true,
    'host': 'localhost',
    'port': 8018,
    'onempty': 'emptyMetadataQueue'
  },
  'tracker': {
    'active': false,
    'interval': 350,  //200,
    'retry': 5000,
    'silent': true,
    'host': 'localhost',
    'port': 8010,
    'onempty': false
  },
  'status': {
    'active': false,
    'interval': 335,
    'retry': 5000,
    'silent': true,
    'host': 'localhost',
    'port': 8015,
    'onempty': 'emptyStatusQueue'
  },
  'media': {
    'active': false,
    'interval': 500,
    'retry': 5000,
    'silent': true,
    'host': 'localhost',
    'port': 8013,
    'onempty': 'emptyMediaQueue'
  },
  'propagate': {
    'active': false,
    'interval': 60000,
    'retry': 30000,
    'silent': true,
    'host': 'localhost',
    'port': 8011,
    'onempty': false
  },
  'live': false,
  'datapath': '.data/',
  'clusterid': -1,
  'removedead': false,
  'indexfiles': false,
  'autoqueue': false,
  'autogc': false
}

var services = ['metadata', 'tracker', 'status', 'media', 'propagate']
var serviceOverwrites = ['retry', 'interval', 'silent']

var commandLineParameters = {}
var config = exports.config = {}

exports.process = function () {
  //get command line parameters
  Object.keys(sails.config).forEach(function(key) {
    if (sailsDefaultConfigKeys.indexOf(key) == -1) {
      commandLineParameters[key] = sails.config[key]
    }
  })
  config = extendObject(config, defaultConfig)

  var configFile,
    configFileContent = {},
    saveConfigFile = releaseObjectKey(commandLineParameters, 'save') || false,
    value = null
  //--config-file=<filename>
  if ((configFile = releaseObjectKey(commandLineParameters, 'config-file')) != null) {
    try {
      var fs = require('fs')
      var data = fs.readFileSync(configFile)
      configFileContent = JSON.parse(data)
    } catch(err) {
      console.warn("Unable to read config from: " + configFile)
    }
    config = extendObject(config, configFileContent)
  }
  //serviceOverwrites: ['retry', 'interval', 'silent']
  for (var i in serviceOverwrites) {
    if ((value = releaseObjectKey(commandLineParameters, serviceOverwrites[i])) != null) {
      for (var e in services) {
        config[services[e]][serviceOverwrites[i]] = value
      }
    }
  }
  //full index overwrite
  if ((value = releaseObjectKey(commandLineParameters, 'full')) != null) {
    Object.keys(config.index).forEach(function(key) {
      config.index[key]['full'] = value
    })
  }
  //other parameters left
  var parametersLeft = Object.keys(commandLineParameters)
  for (var j in parametersLeft) {
    if ((value = releaseObjectKey(commandLineParameters, parametersLeft[j])) != null) {
      var parts = parametersLeft[j].split("-"),
        numParts = parts.length,
        step = config

      try {
        for (var k in parts) {
          if (--numParts == 0) {
            if (typeof step[parts[k]]['active'] !== "undefined") {
              step[parts[k]]['active'] = value
            } else {
              step[parts[k]] = value
            }
          } else {
            step = step[parts[k]]
          }
        }
      } catch (err) {
        console.warn("Unrecognized parameter: " + parametersLeft[j])
      }
    }
  }
  //save current config to the value specified with "--config-file=<filename>"
  if (saveConfigFile) {
    var fs = require('fs');
    fs.writeFile(configFile, JSON.stringify(config, undefined, 2), function(err) {
      if (err) console.warn(err)
    })
  }

  CommandLineHelpers.config = config
}

var releaseObjectKey = function (object, key) {
  var value = null

  if (typeof object[key] !== "undefined") {
    value = object[key]
    delete object[key]
  }
  return value
}

exports.usage = function () {
  return "\n  Usage: sails lift [actions] [options]\n         forever start app.js [actions] [options]\n\n\
  \033[36mIndex torrents from public sites:\033[0m\n\
    Actions:\n\
      --index-kickass\n\
        Indexes torrents from kickass.to\n\n\
      --index-bitsnoop\n\
        Indexes torrents from bitsnoop.to\n\n\
    Options:\n\
      --full\n\
        If specified, indexes ALL torrents from specified action, once.\n\
        Otherwise, periodically indexes latest torrents only.\n\n\
      --live\n\
        If specified, all torrent UUIDs will be queued to metadata IPC service.\n\n\
  \033[36mBackground services:\033[0m\n\
    Actions:\n\
      --metadata\n\
        Stores metadata of *.torrent files by downloading them from public\n\
        torrent cache sites like torcache.net or torrage.com\n\
      --status\n\
        Update fake status of indexed torrents.\n\n\
      --tracker\n\
        Update peers information from announce trackers.\n\n\
      --media\n\
        Update media related information like IMDB ID and rate.\n\n\
      --propagate\n\
        Propagate database items that were updated recently to remote nodes.\n\n\
    General service options:\n\
      --retry=number\n\
        Interval in milliseconds to wait before a IPC service client tries to\n\
        reconnect.\n\n\
      --interval=number\n\
        Interval in milliseconds between requests.\n\n\
      --silent[=boolean]\n\
        Disable to write IPC log/debug messages to output.\n\n\
    Service specific options:\n\
      NOTE: Replace ACTION with service name.\n\n\
      --ACTION-retry=number\n\
        Interval in milliseconds to wait before IPC service client tries to\n\
        reconnect.\n\n\
      --ACTION-interval=number\n\
        Interval in milliseconds between requests.\n\n\
      --ACTION-silent[=boolean]\n\
        Disable to write IPC log/debug messages to output.\n\n\
      --ACTION-host=string\n\
        Specifies network host of service IPC server.\n\n\
      --ACTION-port=number\n\
        Specifies network port of service IPC server.\n\n\
  \033[36mGlobal options:\033[0m\n\
    --config-file=filename\n\
      File to load config values from it.\n\n\
    --save\n\
      Save current config values to the file specified using: --config-file\n\n\
    --datapath=path\n\
      Path to store items pending of services.\n\n\
    --clusterid=number \033[31mREQUIRED\033[0m\n\
      UUID from ExchangeNode model used to identify this cluster of processes.\n\n\
    --removedead[=boolean]\n\
      Remove dead torrents from database when updating data from trackers.\n\n\
    --indexfiles[=boolean]\n\
      Index torrent filenames from metadata.\n\n";
}

var extendObject = function (primary, secondary) {
  secondary = secondary || null
  var o = extend({}, primary)
  if (secondary != null) {
    extend(o, secondary)
  }
  return o
}


