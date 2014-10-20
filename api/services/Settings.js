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

  self._config = {
    port: {
      key: 'port',
      value: sails.config.port,
      type: 'integer',
      title: 'Port (master/dashboard)',
      help: 'Integer up to 65536',
      desc: 'The default port used by the master in this cluster. It\'s also the dashboard HTTP port so you \
             might want to set it to <span class="inline-pseudobox">80</span>.'
    },
    environment: {
      key: 'environment',
      value: sails.config.environment,
      type: 'string',
      title: 'Environment',
      help: '<span class="inline-pseudobox">development</span> or <span class="inline-pseudobox">production</span>',
      desc: 'The runtime "environment" of your Sails app is either <span class="inline-pseudobox">development</span> \
        or <span class="inline-pseudobox">production</span>.<br />\
        In development, your Sails app will go out of its way to help you\
        (for instance you will receive more descriptive error and debugging output)<br />\
        In production, Sails configures itself (and its dependencies) to optimize performance.\
        You should always put your app in production mode before you deploy it to a server-\
        This helps ensure that your Sails app remains stable, performant, and scalable.'
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
      title: 'Realm',
      help: 'URL',
      desc: 'Please, don\'t edit this field if you are not told to.'
    },
    publicaddress: {
      key: 'publicaddress',
      value: sails.config.publicaddress || 'http://localhost:1337/', //TODO: 'http://',
      type: 'string',
      title: 'Public address',
      help: 'URL',
      desc: 'Public address that points to the root of this dashboard, like <span class="inline-pseudobox">\
        http://yourdomain.com:1337/</span>. Required to communicate with the realm of clusters.'
    },
    clustername: {
      key: 'clustername',
      value: sails.config.clustername || 'Default',
      type: 'string',
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
      title: 'Path to data directory',
      help: 'Relative or absolute path',
      desc: ''
    },
    removedead: {
      key: 'removedead',
      value: sails.config.removedead || false,
      type: 'boolean',
      title: 'Remove dead torrents',
      help: 'Boolean',
      desc: ''
    },
    indexfiles: {
      key: 'indexfiles',
      value: sails.config.indexfiles || false,
      type: 'boolean',
      title: 'Index torrent filenames',
      help: 'Boolean',
      desc: ''
    },
    autogc: {
      key: 'autogc',
      value: sails.config.autogc || false,
      type: 'boolean',
      title: 'Force garbage collection',
      help: 'Boolean',
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
      case 'onblacksails':
        value = sails.config.onblacksails || false
        break
      default:
        console.warn("[Settings] Unrecognized property: " + prop)
    }
  } else {
    value = extend({}, self._config)
    delete value.identitykey
    delete value.cluster
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
    default:
      console.warn("[Settings] Unrecognized property: " + prop)
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
    if (self._config[key].type == 'string') {
      content += "'" + self.get(key) + "',\n"
    } else {
      content += self.get(key) + ",\n"
    }
  })

  content += "  onblacksails: true\n};\n"

  var fs = require('fs');
  fs.writeFile("./config/local.js", content, callback)

}

Settings.prototype.verify = function (key, data) {
  var dataHash = crypto.createHash('md5').update(JSON.stringify(data)).digest("hex")

  return bcrypt.compareSync(this.get('identitykey') + dataHash, key)
}

Settings.prototype.registerClusterInRealm = function (callback) {
  var self = this,
    requestify = require('requestify')

  requestify.post(self.get('realm') + 'cluster/create', {
    url: self.get('publicaddress'),
    name: self.get('clustername'),
    hash: self.get('identitykey')
  }).then(function(response) {
    response.getBody()
    var body = {}
    try {
      body = JSON.parse(response.body)
      if (body.error) {
        return callback(new Error("[REPLY FROM REALM] " + body.error))
      } else {
        var clusterId = Number(body.data.cluster)
        if (clusterId > 0) {
          self.set('cluster', clusterId)
          return callback(null)
        } else {
          return callback(new Error('Cluster ID was expected from realm.'))
        }
      }
    } catch (e) {
      sails.log.error(e)
      sails.log.error(response.body)
      return callback(e)
    }
  }, function(error) {
    callback(error)
  })
}
