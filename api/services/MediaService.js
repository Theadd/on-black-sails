/**
 * Created by Theadd on 7/31/14.
 */

module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  var self = this

  self.config({
    'recentPoolMaxSize': 250,
    'poolMinSize': 50,
    'runInterval': 0,
    'appspace': 'onblacksails.',
    'id': 'media',
    'retry': CommandLineHelpers.config.media.retry,
    'silent': CommandLineHelpers.config.media.silent,
    'networkHost': CommandLineHelpers.config.media.host,
    'networkPort': CommandLineHelpers.config.media.port,
    'path': CommandLineHelpers.config.datapath
  })

  self._isEmptyBusy = false

  self.on('process', function(item) {
    self._task.setStatus('targeting')

    Hash.find()
      .where({ uuid: item })
      .exec(function(err, entries) {
        if (!err && entries.length) {
          self._task.hash = entries[0].uuid
          self._task.mediaField = entries[0].media || {}
          self._task.imdb = ''
          self._task.rate = entries[0].rate || 0
          self._task.role = 'update-media'
          StatusService.queue(self._task.hash)
          TrackerService.queue(self._task.hash)
          if (typeof entries[0].imdb !== "undefined" && entries[0].imdb.length) {
            self._task.imdb = entries[0].imdb
            self._task.use('http://www.omdbapi.com/?i=' +  entries[0].imdb)
          } else {
            var media = MediaHelpers.guessMedia(entries[0].title)
            self._task.media = media
            self._task.use('http://www.omdbapi.com/?i=&t=' + media.name + ((media.year > 0) ? '&y=' + media.year : ''))
          }
        } else {
          console.log("Unexpected error in MediaService.on('process')")
          self._task.setStatus('standby')
        }
      })
  })

  self.on('empty', function() {
    if (!self._isEmptyBusy) {
      self._isEmptyBusy = true
      Hash.find()
        .where({downloaded: true, category: ["movies", "video movies"] })
        .sort('updatedAt ASC')
        .limit(120)
        .exec(function(err, entries) {
          if (!err && entries.length) {
            for (var i in entries) {
              self.queue(entries[i].uuid)
            }
            self._isEmptyBusy = false
          } else {
            console.log("Unexpected error in MediaService.on('empty')")
            self._isEmptyBusy = false
          }
        })
    }
  })
}

module.exports.start = function () {
  var self = this

  self._task = Indexer.createTask(
    function () { return self.run.apply(self, arguments) }
    , CommandLineHelpers.config.media.interval,
    function () { return self.updateMovie.apply(self, arguments) }
  )

  self._task.setCache(7200, 1200) //2h, 20m
}

module.exports.updateMovie = function(content) {
  var self = this,
    res = {}

  try {
    res = JSON.parse(content)
  } catch (e) {
    Hash.update({ uuid: self._task.hash },{ rate: self._task.rate }, function(err, hashes) {
      ++self._stats['items-processed']
    })
    return  //not a valid json
  }

  if (res['Response'] == 'True' && res['Type'] == 'movie'
    && (self._task.imdb.length || res['Title'].toLowerCase() == self._task.media['name'].toLowerCase())) {
    var data = {genre: res['Genre'], media: self._task.mediaField}
    data['media']['imdb'] = res['imdbID']
    data['media']['imdbRating'] = parseFloat(res['imdbRating'])
    data['media']['imdbVotes'] = parseInt(res['imdbVotes'].replace(/,/, ''))
    data['media']['metascore'] = parseInt(res['Metascore'])
    data['media']['title'] = res['Title']
    data['rate'] = (data['media']['imdbVotes'] >= 500) ? data['media']['imdbRating'] * 10 : self._task.rate
    data['imdb'] = res['imdbID']

    Hash.update({ uuid: self._task.hash }, data, function(err, hashes) { ++self._stats['items-processed'] })
  } else {
    Hash.update({ uuid: self._task.hash },{ rate: self._task.rate }, function(err, hashes) { }) //avoid overlapping
    ++self._stats['items-processed']
    MediaHelpers.matchingIMDBIDFromTMDB(
      self._task.media['name'],
      self._task.media['year'],
      function () { return self.updateHashIMDB.apply(self, arguments) },  //TODO: unnecessary .apply
      { hash: self._task.hash }
    )
  }
}

module.exports.updateHashIMDB = function(opts) {
  Hash.update({ uuid: opts['hash'] },{ imdb: opts['imdb'] }, function(err, hashes) { });
}