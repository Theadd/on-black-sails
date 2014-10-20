/**
 * Created by Theadd on 14/10/2014.
 */

module.exports.ValueOfMultiSelect = ValueOfMultiSelect
module.exports.RandomHexString = RandomHexString
module.exports.ValidURL = ValidURL
module.exports.TestPorts = TestPorts

/** Sanitizes a value from user input in a multiple select (front-end).
 *
 * @param input
 * @returns {boolean}
 * @constructor
 */
function ValueOfMultiSelect (input) {
  var output = false

  if (typeof input === "string") {
    try {
      if (typeof JSON.parse(input) === "boolean") { /*do nothing*/ }
    } catch (e) {
      output = String(input)
    }
  } else if (typeof input === "object") {
    if (input instanceof Array) {
      output = input
    }
  }

  return output
}

/** Generate a random hex string.
 *
 * @param len
 * @returns {string}
 * @constructor
 */
function RandomHexString (len) {
  var crypto = require('crypto')
  len = len || 12

  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len)
}

/**
 *
 * @param str
 * @returns {boolean}
 * @constructor
 */
function ValidURL(str) {
  var pattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/i
  /*var pattern = new RegExp('^(https?:\/\/)?'+ // protocol
    '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|'+ // domain name
    '((\d{1,3}\.){3}\d{1,3}))'+ // OR ip (v4) address
    '(\:\d+)?(\/[-a-z\d%_.~+]*)*'+ // port and path
    '(\?[;&a-z\d%_.~+=-]*)?'+ // query string
    '(\#[-a-z\d_]*)?$','i') // fragment locater*/
  if(!pattern.test(str)) {
    return false
  } else {
    return true
  }
}

/** Tests specified ports for availability.
 *
 * @example
 * new Common.TestPorts([1337, 1500, 1501], function (err, res) {
 *   if (res.taken.length) console.error('Some ports are already taken.')
 *   console.log(res)
 * })
 *
 * @param ports Array of ports.
 * @param callback Callback function, providing two parameters, err and res.
 * @constructor
 */
function TestPorts (ports, callback) {
  var self = this
  if (!(self instanceof TestPorts)) return new TestPorts(ports, callback)

  self.queue = (ports || []).slice()
  self.available = []
  self.taken = []

  self.next(callback)
}

TestPorts.prototype.isPortTaken = function (port, fn) {
  var net = require('net')
  var tester = net.createServer()
    .once('error', function (err) {
      if (err.code != 'EADDRINUSE') return fn(err)
      fn(null, true)
    })
    .once('listening', function() {
      tester.once('close', function() { fn(null, false) })
        .close()
    })
    .listen(port)
}

TestPorts.prototype.next = function (callback) {
  var self = this

  if (self.queue.length) {
    var port = self.queue.shift()
    self.isPortTaken(port, function (err, taken) {
      if (err || taken) {
        self.taken.push(port)
      } else {
        self.available.push(port)
      }
      return self.next(callback)
    })
  } else return callback(false, {available: self.available, taken: self.taken})
}

