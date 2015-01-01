/**
 * Created by Theadd on 12/10/2014.
 */

var extend = require('util')._extend
var bcrypt = require('bcrypt')
var crypto = require('crypto')

module.exports = new Settings()

function Settings () {
  var self = this
  if (!(self instanceof Settings)) return new Settings()

  self._category = {
    general: {
      key: 'general',
      title: 'General Settings',
      icon: 'fa-cogs'
    },
    realm: {
      key: 'realm',
      title: 'Realm Settings',
      icon: 'fa-cogs'
    },
    cluster: {
      key: 'cluster',
      title: 'Local Cluster Settings',
      icon: 'fa-cogs'
    },
    access: {
      key: 'access',
      title: 'Access Control Settings',
      icon: 'fa-cogs'
    }
  }

  self._config = {
    port: {
      key: 'port',
      value: sails.config.port,
      type: 'integer',
      category: 'general',
      title: 'Port (master/dashboard)',
      help: 'Integer up to 65536',
      desc: 'The default port used by the master in this cluster. It\'s also the dashboard HTTP port so you \
             might want to set it to <span class="inline-pseudobox">80</span>.'
    },
    environment: {
      key: 'environment',
      value: sails.config.environment,
      type: 'string',
      category: 'general',
      title: 'Environment',
      help: '<span class="inline-pseudobox">development</span> or <span class="inline-pseudobox">production</span>',
      desc: 'The runtime "environment" of your Sails app is either <span class="inline-pseudobox">development</span> \
        or <span class="inline-pseudobox">production</span>.<br /><br />\
        <ul><li>In <strong>development</strong>, your Sails app will go out of its way to help you\
        (for instance you will receive more descriptive error and debugging output).</li>\
        <li>In <strong>production</strong>,, Sails configures itself (and its dependencies) to optimize performance.\
        You should always put your app in production mode before you deploy it to a server-\
        This helps ensure that your Sails app remains stable, performant, and scalable.</li></ul>'
    },
    autoportstart: {
      key: 'autoportstart',
      value: sails.config.autoportstart || 1633,
      type: 'integer',
      category: 'general',
      title: 'Port auto start',
      help: 'Integer up to 65536',
      desc: 'The starting port to use when port is automatically assigned.'
    },
    cluster: {
      key: 'cluster',
      value: sails.config.cluster || 0,
      type: 'integer',
      title: 'Cluster ID',
      help: 'Integer',
      desc: ''
    },
    realm: {
      key: 'realm',
      value: sails.config.realm || 'http://realm.onblacksails.com:42000/',
      type: 'string',
      category: 'realm',
      title: 'Realm',
      help: 'URL',
      desc: 'Please, don\'t edit this field if you are not told to.'
    },
    publicaddress: {
      key: 'publicaddress',
      value: sails.config.publicaddress || 'http://localhost:1337/', //TODO: 'http://',
      type: 'string',
      category: 'realm',
      title: 'Public address',
      help: 'URL',
      desc: 'Public address that points to the root of this dashboard, like <span class="inline-pseudobox">\
        http://yourdomain.com:1337/</span>. Required to communicate with the realm of clusters.'
    },
    clustername: {
      key: 'clustername',
      value: sails.config.clustername || 'Default',
      type: 'string',
      category: 'cluster',
      title: 'Cluster Name',
      help: 'String',
      desc: ''
    },
    identitykey: {
      key: 'identitykey',
      value: sails.config.identitykey || bcrypt.hashSync(crypto.randomBytes(Math.ceil(15 / 2)).toString('hex').slice(0, 15), 14),
      type: 'string',
      title: 'Cluster identity key',
      help: 'String',
      desc: 'Specify a password/passphrase that you will remember for sure the next time you need to do a clean \
        install. It will only be used internally to communicate with the realm of clusters.'
    },
    datapath: {
      key: 'datapath',
      value: sails.config.datapath || '.data/',
      type: 'string',
      category: 'general',
      title: 'Path to data directory',
      help: 'Relative or absolute path',
      desc: ''
    },
    removedead: {
      key: 'removedead',
      value: sails.config.removedead || false,
      type: 'boolean',
      category: 'cluster',
      title: 'Remove dead torrents',
      help: 'Boolean',
      desc: 'Remove dead torrents'
    },
    timekeepingdead: {
      key: 'timekeepingdead',
      value: sails.config.timekeepingdead || 0,
      type: 'integer',
      category: 'cluster',
      title: 'Time keeping dead torrents',
      help: 'Integer (in seconds)',
      desc: 'Time keeping dead torrents in seconds (Only when <span class="inline-pseudobox">Remove dead \
        torrents</span> is enabled). 0 = do not keep dead torrents, X = time in seconds.'
    },
    indexfiles: {
      key: 'indexfiles',
      value: sails.config.indexfiles || false,
      type: 'boolean',
      category: 'cluster',
      title: 'Index torrent filenames',
      help: 'Boolean',
      desc: 'Index torrent filenames'
    },
    autogc: {
      key: 'autogc',
      value: sails.config.autogc || false,
      type: 'boolean',
      category: 'general',
      title: 'Force garbage collection',
      help: 'Boolean',
      desc: 'When enabled, each proccess in your local cluster will call <span class="inline-pseudobox">global.gc()\
        </span> every 90 seconds in order to collect/free memory garbage.'
    },
    publicaccess: {
      key: 'publicaccess',
      value: (typeof sails.config.publicaccess === "boolean") ? sails.config.publicaccess : true,
      type: 'boolean',
      category: 'access',
      title: 'Public access',
      help: 'Boolean',
      desc: 'Allow access to sensitive areas of the system for non-localhost users. <strong>Caution</strong>: When \
        disabled, you won&apos;t be able to access some areas of the dashboard unless yo do it from the same machine.'
    },
    apionmaster: {
      key: 'apionmaster',
      value: (typeof sails.config.apionmaster === "boolean") ? sails.config.apionmaster : true,
      type: 'boolean',
      category: 'access',
      title: 'API access on Master',
      help: 'Boolean',
      desc: 'Allow access to the Restful API on master process.'
    },
    localcluster: {
      key: 'localcluster',
      value: sails.config.localcluster || bcrypt.hashSync(crypto.randomBytes(Math.ceil(15 / 2)).toString('hex').slice(0, 15), 10),
      type: 'string',
      category: 'cluster',
      title: 'Local Cluster UUID',
      help: '',
      desc: ''
    },
    database: {
      key: 'database',
      value: sails.config.database || 'mongodb',
      type: 'string',
      category: 'general',
      title: 'Database Type',
      help: '<span class="inline-pseudobox">mongodb</span>',
      desc: 'Any database supported by <strong>Waterline</strong> is allowed but at the moment, \
      native calls (which are faster) are available using <span class="inline-pseudobox">mongodb</span>.'
    },
    ready: {
      key: 'ready',
      value: sails.config.ready || false,
      type: 'boolean',
      title: '',
      help: '',
      desc: ''
    }
  }

}

Settings.prototype.get = function (prop) {
  var self = this, value = null

  if (prop && prop.length) {
    switch (prop) {
      case 'port':
        value = self._config.port.value
        break
      case 'environment':
        value = self._config.environment.value
        break
      case 'autoportstart':
        value = self._config.autoportstart.value
        break
      case 'cluster':
        value = self._config.cluster.value
        break
      case 'realm':
        value = self._config.realm.value
        break
      case 'publicaddress':
        value = self._config.publicaddress.value
        break
      case 'clustername':
        value = self._config.clustername.value
        break
      case 'identitykey':
        value = self._config.identitykey.value
        break
      case 'datapath':
        value = self._config.datapath.value
        break
      case 'removedead':
        value = self._config.removedead.value
        break
      case 'indexfiles':
        value = self._config.indexfiles.value
        break
      case 'autogc':
        value = self._config.autogc.value
        break
      case 'ready':
        value = self._config.ready.value
        break
      case 'publicaccess':
        value = self._config.publicaccess.value
        break
      case 'apionmaster':
        value = self._config.apionmaster.value
        break
      case 'localcluster':
        value = self._config.localcluster.value
        break
      case 'database':
        value = self._config.database.value
        break
      default:
        console.trace()
        sails.log.warn("[Settings] Unrecognized property: " + prop)
    }
  } else {
    value = extend({}, self._config)
    delete value.identitykey
    delete value.cluster
    delete value.localcluster
    delete value.ready
  }

  return value
}

Settings.prototype.set = function (prop, value) {
  var self = this

  switch (prop) {
    case 'port':
      self._config.port.value = Number(value)
      break
    case 'environment':
      self._config.environment.value = String(value)
      break
    case 'autoportstart':
      self._config.autoportstart.value = Number(value)
      break
    case 'cluster':
      self._config.cluster.value = Number(value)
      break
    case 'realm':
      self._config.realm.value = String(value)
      break
    case 'publicaddress':
      self._config.publicaddress.value = String(value)
      break
    case 'clustername':
      self._config.clustername.value = String(value)
      break
    case 'identitykey':
      if (Entity.isSlave) {
        self._config.identitykey.value = String(value)
      } else {
        sails.log.error("Unable to set settings value of 'identitykey' in master.")
      }
      break
    case 'datapath':
      self._config.datapath.value = String(value)
      break
    case 'removedead':
      self._config.removedead.value = Boolean(JSON.parse(value))
      break
    case 'indexfiles':
      self._config.indexfiles.value = Boolean(JSON.parse(value))
      break
    case 'autogc':
      self._config.autogc.value = Boolean(JSON.parse(value))
      break
    case 'ready':
      self._config.ready.value = Boolean(JSON.parse(value))
      break
    case 'publicaccess':
      self._config.publicaccess.value = Boolean(JSON.parse(value))
      break
    case 'apionmaster':
      self._config.apionmaster.value = Boolean(JSON.parse(value))
      break
    case 'localcluster':
      self._config.localcluster.value = Boolean(JSON.parse(value))
      break
    case 'database':
      self._config.database.value = String(value)
      break
    default:
      console.trace()
      sails.log.warn("[Settings] Unrecognized property: " + prop)
  }
}

Settings.prototype.save = function (callback) {
  var self = this, content = "module.exports = {\n"

  Object.keys(self._config).forEach(function(key) {
    content += "  " + key + ": "
    if (key == 'port') {
      content += "process.env.PORT || "
    } else if (key == 'environment') {
      content += "process.env.NODE_ENV || "
    }
    if (key != 'ready') {
      if (self._config[key].type == 'string') {
        content += "'" + self.get(key) + "',\n"
      } else {
        content += self.get(key) + ",\n"
      }
    } else {
      content += self.get(key) + "\n};\n"
    }
  })

  var fs = require('fs');
  fs.writeFile("./config/local.js", content, callback)

}

Settings.prototype.getCategories = function () {
  return extend({}, this._category)
}
