/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!documentation/
 */


module.exports.policies = {

  // Default policy for all controllers and actions
  // (`true` allows public access)
  '*': "flash",

  user: {
    'new': ["frontend", "flash"],
    subscribe: ["frontend", "flash", "authenticated"],
    create: ["frontend", "flash"],
    show: ["frontend", "userCanSeeProfile"],
    edit: ["frontend", "userCanSeeProfile"],
    update: ["frontend", "userCanSeeProfile"],
    '*': ["frontend", "admin"]
  },
  linkedentity: {
    'new': ["master", "flash", "servicequeuemodels", "admin"],
    subscribe: ["master", "public", "flash"],
    index: ["master", "public", "flash"],
    create: ["master", "admin"],
    edit: ["master", "public", "flash", "servicequeuemodels", "localclusters", "signedin"],
    update: ["master", "admin"],
    toggle: ["master", "admin"],
    command: ["master", "admin"],
    detail: ["master", "public", "flash"],
    stats: ["master", "public"],
    '*': false
  },
  settings: {
    index: ["master", "flash", "admin"],
    update: ["master", "flash", "admin"],
    '*': false
  },
  message: {
    create: ["master", "flash"],
    '*': false
  },
  agreement: {
    index: ["master", "public", "flash", "servicequeuemodels"],
    'new': ["master", "flash", "admin", "servicequeuemodels"],
    create: ["master", "flash", "admin"],
    subscribe: ["master", "public", "flash"],
    action: ["master", "admin"],
    propagate: ["master"],
    history: ["master"],
    '*': false
  },
  realm: {
    index: ["frontend", "flash"],
    verify: ["master", "flash"],
    edit: ["master", "flash", "admin"],
    update: ["master", "flash", "admin"],
    '*': false
  },
  localcluster: {
    index: ["master", "flash", "admin"],
    edit: ["master", "flash", "admin"],
    update: ["master", "flash", "admin"],
    '*': "flash"
  }

};
