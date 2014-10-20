/**
 * Created by Theadd on 20/10/2014.
 */

module.exports = {

  schema: true,
  connection: 'memory',

  attributes: {
    id: {
      type: 'integer',
      required: true,
      unique: true
    },

    name: {
      type: 'string',
      required: true
    },

    url: {
      type: 'string',
      required: true
    },

    note: {
      type: 'string',
      defaultsTo: ''
    },

    reputation: {
      type: 'integer',
      defaultsTo: 0
    },

    status: {
      type: 'string',
      defaultsTo: 'stable'
    },

    indexfiles: {
      type: 'boolean',
      defaultsTo: false
    },

    removedead: {
      type: 'boolean',
      defaultsTo: false
    },

    total: {
      type: 'integer',
      defaultsTo: 0
    },

    downloaded: {
      type: 'integer',
      defaultsTo: 0
    },

    scraped: {
      type: 'integer',
      defaultsTo: 0
    }

  }
};
