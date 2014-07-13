/**
 * Created by Theadd on 7/13/14.
 */

exports.usage = function () {
  //Usage: program [-aDde] [-f | -g] [-n number] [-b b_arg | -c c_arg] req1 req2 [opt1 [opt2]]
  return " \
  ";
  /*
   [--full-index] [--update-index] [--update-metadata[=number]] [--update-status[=number] --update-media[=number]]
   */
}

exports.getValues = function() {
  return {
    'full-index': Boolean(sails.config['full-index']),
    'update-index': Boolean(sails.config['update-index']),
    'update-metadata': Boolean(sails.config['update-metadata']),
    'update-metadata-interval': (typeof sails.config['update-metadata'] === 'number') ? sails.config['update-metadata'] : 250,
    'update-status': Boolean(sails.config['update-status']),
    'update-status-interval': (typeof sails.config['update-status'] === 'number') ? sails.config['update-status'] : 335,
    'update-media': Boolean(sails.config['update-media']),
    'update-media-interval': (typeof sails.config['update-media'] === 'number') ? sails.config['update-media'] : 500
  }
}