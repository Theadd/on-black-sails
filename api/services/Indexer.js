/**
 * Created by Admin on 5/30/14.
 */

/*VERIFIED = 2
 GOOD = 1
 NONE|ERROR|NOTFOUND = 0
 BAD = -1
 FAKE = -2*/
var status2value = { 'VERIFIED': 2, 'GOOD': 1, 'NONE': 0, 'ERROR': 0, 'NOTFOUND': 0, 'BAD': -1, 'FAKE': -2 };
var requestify = require('requestify');

exports.run = function() {

  var later = require('later');
  var schedule5sec = later.parse.text('every 5 sec');
  var schedule10min = later.parse.text('every 10 min');
  var scheduleUpdateStatus = later.parse.text('every 1 sec');

  var timerMetadata = later.setInterval(updateMetadata, schedule5sec);
  var timerProcess = later.setInterval(process, schedule10min);
  var timerStatus = later.setInterval(updateStatus, scheduleUpdateStatus);
  process();
}

var process = function() {

  //var requestify = require('requestify');
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
            data['source'] = line[p];
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
            //Update Hash model
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
            //Update File model
            for (var i in metadata.files) {
              var data = {};
              data['hash'] = entries[0].id; //hash, file, title, category, added, size
              data['file'] = metadata.files[i].name;
              data['title'] = entries[0].title;
              data['category'] = entries[0].category;
              data['added'] = new Date(metadata.creationDate);
              data['size'] = metadata.files[i].size;
              File.create(data).done(function(err, fileentry) {
                if (!err) {
                  console.log("File added: ", fileentry.file);
                } else {
                  console.log(err);
                }
              });
            }

          }
        });
      }
  });

}



var updateStatus = function() {

  Hash.find()
    .where({ downloaded: true })
    .sort('updatedAt ASC')
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        //Update fake status
        requestify.get('http://bitsnoop.com/api/fakeskan.php?hash=' + entries[0].id.toUpperCase()).then(function(response) {
          response.getBody();
          console.log("FAKESCAN=#" + response.body + "# for "+entries[0].title);
          var value = status2value[response.body];
          if (value > -10 && value < 10) {
            Hash.update({ id: entries[0].id },{ status: value }, function(err, hashes) { });
          }
        });
      }
    });
}
