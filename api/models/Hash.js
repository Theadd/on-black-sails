/**
* Hash.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  //adapter: 'mongo',
  //migrate: 'drop',

  attributes: {

    id: {
      type: 'string',
      unique: true,
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

    files: {
      type: 'array',
      defaultsTo: []
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
    //http:\/\/torrage.com\/torrent\/CAAB3CB4B58116733397934793F869EBFF8E14EA.torrent
    //magnet:?xt=urn:btih:2c76d7b989b9dc2daecfd4f3764ba445b6f08b45&dn=Mafia%20II-SKIDROW%20%28Mafia%202%29
    toJSON: function() {
      var obj = this.toObject();
      obj.link = "http://torrage.com/torrent/" + obj.id.toUpperCase() + ".torrent";
      obj.magnet = "magnet:?xt=urn:btih:" + obj.id.toLowerCase() + "&dn=" + encodeURI(obj.title);
      obj.category = obj.category.toLowerCase();
      delete obj.downloaded;
      return obj;
    }

  }

};
