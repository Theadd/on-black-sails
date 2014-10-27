/**
 * Created by Theadd on 27/10/2014.
 */

var extend = require('util')._extend

var agreementActions = {
  accept: {
    key: 'accept',
    display: 'Accept',
    help: 'Accept',
    enabled: false
  },
  refuse: {
    key: 'refuse',
    display: 'Refuse',
    help: 'Refuse',
    enabled: false
  },
  cancel: {
    key: 'cancel',
    display: 'Cancel',
    help: 'Cancel',
    enabled: false
  },
  pause: {
    key: 'pause',
    display: 'Pause',
    help: 'Pause',
    enabled: false
  },
  resume: {
    key: 'resume',
    display: 'Resume',
    help: 'Resume',
    enabled: false
  },
  delete: {
    key: 'delete',
    display: 'Delete',
    help: 'Delete',
    enabled: false
  }
}

module.exports = ClusterAgreement

function ClusterAgreement (data) {
  var self = this
  if (!(self instanceof ClusterAgreement)) return new ClusterAgreement(data)

  self.rebuild(data)
}

ClusterAgreement.prototype.rebuild = function (data) {
  var self = this, agreement = {}, raw = extend({}, data)

  self._rawdata = raw

  if (Settings.get('cluster') != raw.sender.id) {
    agreement.issender = false;
    agreement.localnode = extend({}, raw.receiver)
    agreement.remotenode = extend({}, raw.sender)
    //sender is remotenode, outgoing (remote offer)
    agreement.remotenode.allsources = raw.outgoingallsources
    agreement.remotenode.filters = raw.outgoingfilters
    //receiver is localnode, incoming (our offer)
    agreement.localnode.allsources = raw.incomingallsources
    agreement.localnode.filters = raw.incomingfilters
  } else {
    agreement.issender = true;
    agreement.localnode = extend({}, raw.sender)
    agreement.remotenode = extend({}, raw.receiver)
    //sender is localnode, outgoing (our offer)
    agreement.localnode.allsources = raw.outgoingallsources
    agreement.localnode.filters = raw.outgoingfilters
    //receiver is remotenode, incoming (remote offer)
    agreement.remotenode.allsources = raw.incomingallsources
    agreement.remotenode.filters = raw.incomingfilters
  }
  agreement.title = raw.title
  agreement.status = raw.status
  agreement.note = raw.note
  agreement.id = raw.id
  agreement.createdAt = raw.createdAt

  self._agreement = agreement
}

ClusterAgreement.prototype.get = function () {
  return extend({}, this._agreement)
}

ClusterAgreement.prototype.getStatus = function () {
  return this._agreement.status
}

ClusterAgreement.prototype.getId = function () {
  return this._agreement.id
}

ClusterAgreement.prototype.isSender = function () {
  return this._agreement.issender
}

ClusterAgreement.prototype.getActions = function () {
  var self = this, actions = extend({}, agreementActions)

  switch (self.getStatus()) {
    case 'pending':
      actions.accept.enabled = !self.isSender()
      actions.refuse.enabled = !self.isSender()
      actions.cancel.enabled = self.isSender()
      break;
    case 'accepted':
      actions.pause.enabled = true
      actions.resume.enabled = true
      actions.cancel.enabled = true
      break;
    case 'denied':
      actions.delete.enabled = self.isSender()
      break;
    case 'cancelled':
      actions.delete.enabled = self.isSender()
      break;
    case 'paused':
      actions.resume.enabled = true
      actions.cancel.enabled = true
      break;
  }

  return actions
}







