/**
 * Created by Theadd on 6/16/14.
 */


/** Returns an array of json waterline queries required to match an advanced search string.
 * Converted from: https://github.com/Theadd/TorrentzRSS/blob/master/process.php#L131
 * @example getWaterlineQueryFromString('these words "this phrase" | "exactword" blue | "red hair"', 'title')
 * [
 *  {"title": { "contains": "these" } },
 *  {"title": { "contains": "words" } },
 *  {"or": [
 *   {"title": { "contains": "this phrase" } },
 *   {"title": { "contains": "exactword"  } }
 *  ]},
 *  {"or": [
 *   {"title": { "contains": "blue" } },
 *   { "title": { "contains": "red hair" } }
 *  ]}
 * ]
 *
 * @param string {String} Advanced search string.
 * @param field {String} ORM field to match.
 * @return array Array of json waterline queries.
 */
exports.getWaterlineQueryFromString = function(string, field) {
  string +=  ' '
  var patterns = [],
    aux = [],
    str = str_getcsv(getReady4CSV(string), " ")

  str.push("")

  var last_value = str[str.length - 1]

  for (var key = 0; key < str.length; ++key) {
    var value2 = str[key]
    if (value2 == "|") {
      var tmp = [],
        tmp_line1 = {},
        tmp_line2 = {}
      if (key == str.length - 2) {
        tmp_line1[field] = { contains: str[key - 1] }
        tmp_line2[field] = { contains: last_value }
        tmp.push(tmp_line1)
        tmp.push(tmp_line2)
        aux.push({or: tmp})
      } else {
        tmp_line1[field] = { contains: str[key - 1] }
        tmp_line2[field] = { contains: str[key + 1] }
        tmp.push(tmp_line1)
        tmp.push(tmp_line2)
        aux.push({or: tmp})
      }
      str[key - 1] = ""
      str[key] = ""
      str[key + 1] = ""
    }
  }

  for (var valueKey2 in str) {
    var value3 = str[valueKey2]

    if (value3.length) {
      var line = {}
      line[field] = { contains: value3 }
      patterns.push(line)
    }
  }

  patterns = patterns.concat(aux)

  return patterns
}


function str_getcsv (input, delimiter, enclosure, escape) {
  // http://kevin.vanzonneveld.net
  // +   original by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: str_getcsv('"abc", "def", "ghi"');
  // *     returns 1: ['abc', 'def', 'ghi']
  var output = [];
  var backwards = function (str) { // We need to go backwards to simulate negative look-behind (don't split on
    //an escaped enclosure even if followed by the delimiter and another enclosure mark)
    return str.split('').reverse().join('');
  };
  var pq = function (str) { // preg_quote()
    return (str + '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
  };

  delimiter = delimiter || ',';
  enclosure = enclosure || '"';
  escape = escape || '\\';

  input = input.replace(new RegExp('^\\s*' + pq(enclosure)), '').replace(new RegExp(pq(enclosure) + '\\s*$'), '');

  // PHP behavior may differ by including whitespace even outside of the enclosure
  input = backwards(input).split(new RegExp(pq(enclosure) + '\\s*' + pq(delimiter) + '\\s*' + pq(enclosure) + '(?!' + pq(escape) + ')', 'g')).reverse();

  for (var i = 0; i < input.length; i++) {
    output.push(backwards(input[i]).replace(new RegExp(pq(escape) + pq(enclosure), 'g'), enclosure));
  }

  return output;
}

function getReady4CSV (input) {
  var str = input.replace(/"/g, "!")

  str = str.replace(/\b(.*?)\b/g, "\"$1").replace(/(\|)/g, "\"$1\"")
  str = str.replace(/(![^!]+!)/g, function(_, grp) {
    return grp.replace(/"/g, '').replace(/!/g, '"')
  });

  return str
}
