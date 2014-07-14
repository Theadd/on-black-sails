/**
* Hash.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  //adapter: 'mongo',
  migrate: 'alter', // adds and/or removes columns on changes to the schema
  //migrate: 'drop', // drops all your tables and then re-creates them. All data is deleted.
  //migrate: 'safe', doesn't do anything on sails lift- for use in production.
  autoPK: false,

  attributes: {

    uuid: {
      type: 'string',
      unique: true,
      primaryKey: true,
      required: true/*,
       len: 40,
       alphanumeric: true,
       uuid: true*/
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

    trackers: {
      type: 'array',
      defaultsTo: []
    },

    /*files: {
      type: 'array',
      defaultsTo: []
    },*/

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
    /*cache: {
     type: 'string',
     enum: ['', 'torrage.com', 'torcache.net']
     }*/

    toJSON: function() {
      var obj = this.toObject();
      if (typeof obj.cache !== "undefined" && obj.cache.length) {
        obj.link = Indexer.getDownloadLink(obj.uuid, obj.cache, obj.source);
        obj.magnet = "magnet:?xt=urn:btih:" + obj.uuid.toLowerCase() + "&dn=" + encodeURI(obj.title);
      } else {
        obj.magnet = "magnet:?xt=urn:btih:" + obj.uuid.toLowerCase() + "&dn=" + encodeURI(obj.title);
        obj.link = obj.magnet;
      }
      obj.category = obj.category.toLowerCase();
      //delete obj.downloaded;
      return obj;
    }

  }

};
