/**
* Message.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  schema: true,

  attributes: {

    type: {
      type: 'string',
      enum: [
        //Cluster to cluster related actions:
        'message',
        //Agreement related actions:
        'request',
        'accept',
        'refuse',
        'cancel',
        'pause',
        'resume',
        'delete',
        'comment'
      ],
      required: true
    },

    note: {
      type: 'string',
      defaultsTo: ''
    },

    agreement: {
      type: 'json',
      defaultsTo: {}
    },

    sender: {
      type: 'json',
      defaultsTo: {}
    },

    receiver: {
      type: 'json',
      defaultsTo: {}
    },

    read: {
      type: 'boolean',
      defaultsTo: false
    }
  }
};

