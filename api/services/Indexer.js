/**
 * Created by Admin on 5/30/14.
 */


exports.run = function() {

  var later = require('later');
  var schedule5sec = later.parse.text('every 5 sec');
  var schedule10min = later.parse.text('every 10 min');

  var timerMetadata = later.setInterval(updateMetadata, schedule5sec);
  var timerProcess = later.setInterval(process, schedule10min);
}

var process = function() {

  var requestify = require('requestify');
  var url = 'http://bitsnoop.com/api/latest_tz.php?t=all';

  console.log("downloading...");

  requestify.get(url).then(function(response) {

    response.getBody();
    var lines = response.body.split("\n");

    for (i in lines) {
      if (lines.hasOwnProperty(i)) {
        //console.log(lines[i]);
        var line = lines[i].split("|");
        var p;
        var index = "";
        var data = {};
        for (p = 0; p < line.length; ++p) {
          //console.log(p + " => " + line[p] + " " + line[p].length);
          if (p == 0) {
            index = line[p];
            data['id'] = line[p];
          } else if (p == 1) {
            data['title'] = line[p];
          } else if (p == 2) {
            data['category'] = line[p];
          } else if (p == 3) {
            //data['guid'] = line[p];
          } else if (p == 4) {
            //data['link'] = line[p];
          }
        }
        if (index.length) {
          Hash.create(data).done(function(err, entry) {
            if (!err) {
              console.log("Added: ", entry.title);
            }
          });
        }

      }
    }
  });


}



var updateMetadata = function() {

  Hash.find()
    .where({ downloaded: false })
    .sort('updatedAt ASC')
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        var nt = require('nt');
        nt.read('http://torrage.com/torrent/' + entries[0].id.toUpperCase() + '.torrent', function(err, torrent) {
          if (err) {
            Hash.update({ id: entries[0].id },{ size: 0 }, function(err, hashes) { });
          } else {
            var metadata = TorrentUtils.getEverything(torrent.metadata);
            Hash.update({ id: entries[0].id },{
              size: metadata.size,
              trackers: metadata.trackers,
              files: metadata.files,
              downloaded: true,
              added: new Date(metadata.creationDate)
            }, function(err, hashes) {
              if (err) {
                console.log(err);
              }
            });
          }
        });
      }
  });

}



