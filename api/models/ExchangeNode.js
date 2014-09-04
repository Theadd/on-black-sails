/**
* ExchangeNode.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {

    uuid: {
      type: 'string',
      required: true
    },

    baseURL: {
      type: 'string',
      required: true
    },

    key: {
      type: 'string',
      required: true
    },

    wantsAlive: {
      type: 'boolean',
      defaultsTo: false
    },

    wantsDead: {
      type: 'boolean',
      defaultsTo: false
    },

    wantsFiles: {
      type: 'boolean',
      defaultsTo: false
    },

    enabled: {
      type: 'boolean',
      defaultsTo: true
    }
  }
};

