/**
* File.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  //adapter: 'mongo',
  //migrate: 'drop',

  attributes: {

    hash: {
      type: 'string',
      required: true
    },

    file: {
      type: 'string',
      required: true
    },

    title: {
      type: 'string',
      required: true
    },

    category: {
      type: 'string',
      required: true
    },

    added: {
      type: 'datetime'
    },

    size: {
      type: 'integer',
      defaultsTo: 0
    }

  }

};
