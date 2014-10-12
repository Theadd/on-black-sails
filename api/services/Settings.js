/**
 * Created by Theadd on 12/10/2014.
 */

var extend = require('util')._extend

module.exports = new Settings()

function Settings () {
  var self = this
  if (!(self instanceof Settings)) return new Settings()

  self._config = {
    port: {
      key: 'port',
      value: sails.config.port,
      title: 'Port (master/dashboard)',
      help: 'Integer up to 65536',
      desc: 'The default port used by the master in this cluster. It\'s also the dashboard HTTP port so you \
             might want to set it to <span class="inline-pseudobox">80</span>.'
    },
    environment: {
      key: 'environment',
      value: sails.config.environment,
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
      title: 'Cluster ID',
      help: 'Integer',
      desc: ''
    },
    datapath: {
      key: 'datapath',
      value: sails.config.datapath || '.data/',
      title: 'Path to data directory',
      help: 'Relative or absolute path',
      desc: ''
    },
    removedead: {
      key: 'removedead',
      value: sails.config.removedead || false,
      title: 'Remove dead torrents',
      help: 'Boolean',
      desc: ''
    },
    indexfiles: {
      key: 'indexfiles',
      value: sails.config.indexfiles || false,
      title: 'Index torrent filenames',
      help: 'Boolean',
      desc: ''
    },
    autogc: {
      key: 'autogc',
      value: sails.config.autogc || false,
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
      default:
        console.warn("[Settings] Unrecognized property: " + prop)
    }
  } else {
    value = extend({}, self._config)
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
    case 'datapath':
      self._config.datapath.value = String(value)
      break
    case 'removedead':
      self._config.removedead.value = Boolean(value)
      break
    case 'indexfiles':
      self._config.indexfiles.value = Boolean(value)
      break
    case 'autogc':
      self._config.autogc.value = Boolean(value)
      break
    default:
      console.warn("[Settings] Unrecognized property: " + prop)
  }
}

Settings.prototype.save = function () {
  var self = this

}
