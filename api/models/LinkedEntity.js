/**
 * Created by Theadd on 05/10/2014.
 */

module.exports = {

  schema: true,

  attributes: {
    name: {
      type: 'string',
      required: true
    },

    config: {
      type: 'json',
      defaultsTo: {}
    },

    enabled: {
      type: 'boolean',
      defaultsTo: true
    },

    respawn: {
      type: 'boolean',
      defaultsTo: true
    },

    port: {
      type: 'integer',
      required: true
    }

  }
};