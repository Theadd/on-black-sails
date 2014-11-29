/**
* Hash.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  migrate: 'alter', // adds and/or removes columns on changes to the schema
  //migrate: 'drop', // drops all your tables and then re-creates them. All data is deleted.
  //migrate: 'safe', doesn't do anything on sails lift- for use in production.
  autoPK: false,

  attributes: {

    uuid: {
      type: 'string',
      unique: true,
      primaryKey: true,
      required: true
    },

    title: {
      type: 'string'
    },

    category: {
      type: 'string'
    },

    added: {
      type: 'datetime'
    },

    trackers: {
      type: 'array',
      defaultsTo: []
    },

    files: {
      type: 'integer',
      defaultsTo: 0
    },

    downloaded: {
      type: 'boolean',
      defaultsTo: false
    },

    source: {
      type: 'string'
    },

    size: {
      type: 'integer',
      defaultsTo: 0
    },

    seeders: {
      type: 'integer',
      defaultsTo: 0
    },

    leechers: {
      type: 'integer',
      defaultsTo: 0
    },

    status: {
      type: 'integer',
      defaultsTo: 0
      /*VERIFIED = 2
       GOOD = 1
       NONE|ERROR|NOTFOUND = 0
       BAD = -1
       FAKE = -2*/
    },

    media: {
      type: 'json',
      defaultsTo: {}
    },

    genre: {
      type: 'string'
    },

    rate: {
      type: 'integer',
      defaultsTo: 0
    },

    imdb: {
      type: 'string'
    },

    cache: {
      type: 'string',
      defaultsTo: ''
    },

    updatedBy: {
      type: 'integer',
      defaultsTo: 0
    },

    peersUpdatedAt: {
      type: 'datetime'
    },

    toJSON: function() {
      var obj = this.toObject();
      obj.category = obj.category.toLowerCase();
      return obj;
    }

  }

};
