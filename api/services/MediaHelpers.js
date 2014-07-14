/**
 * Created by Theadd on 6/16/14.
 */

exports.guessMedia = function (input) {
  input = input.replace(/\./g, ' ')
  var title = input.toLowerCase(),
    delimiters_pos = title.search(/(?:dvd.?scr(?:eener)?)|(?:br.?scr(?:eener)?)|(?:bluray.?scr(?:eener)?)|(?:hdtv.?scr(?:eener)?)|(?:br.?rip)|(?:bd.?rip)|(?:bluray.?rip)|(?:bluray)|(?:dvd.?rip)|(?:web.?rip)|(?:screener)|(?:hdtv)|1080p|720p|360p|480p|(?:(?:md.?)?telesync)|xvid/),
    DeLiMiTeRS_pos = input.search(/(?:\biTALiAN\b)|(?:\bEng\b)|(?:\bR5\b)|(?:\bx264\b)|(?:\bAAC\b)|(?:\bFULL\b)|(?:\bViDEO\b)|(?:\bENG\b)|(?:\bTS\b)|(?:\bREPACK\b)/),
    year_pos = title.regexLastIndexOf(/(?:\b19[0-9][0-9]\b)|(?:\b20[012][0-9]\b)/),  //.search(/(?:\b19[0-9][0-9]\b)|(?:\b20[012][0-9]\b)/),
    other_pos = title.search(/\[|\(|(?:\bs\d+e\d+\b)/),
    pos = title.length,
    media = {original: title}


  pos = (delimiters_pos > 3) ? delimiters_pos : pos
  pos = (year_pos > 3 && year_pos < pos) ? year_pos : pos
  pos = (other_pos > 3 && other_pos < pos) ? other_pos : pos
  pos = (DeLiMiTeRS_pos > 3 && DeLiMiTeRS_pos < pos) ? DeLiMiTeRS_pos : pos

  media['name'] = input.substr(0, pos).trim()
  media['desc'] = input.substr(pos).trim()
  media['year'] = (year_pos > 3) ? title.substr(year_pos, 4) : 0

  return media
}

String.prototype.regexLastIndexOf = function(regex, startpos) {
  regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
  if(typeof (startpos) == "undefined") {
    startpos = this.length;
  } else if(startpos < 0) {
    startpos = 0;
  }
  var stringToWorkWith = this.substring(0, startpos + 1);
  var lastIndexOf = -1;
  var nextStop = 0;
  while((result = regex.exec(stringToWorkWith)) != null) {
    lastIndexOf = result.index;
    regex.lastIndex = ++nextStop;
  }
  return lastIndexOf;
}

exports.matchingIMDBIDFromTMDB = function (title, year, cb, opts) {
  var MovieDB = require('moviedb')('d64e9dd43d0bc3187bb0254ccfe01257')  //TODO: config/local.js
  opts = opts || {}

  MovieDB.searchMovie({query: title }, function(err, mdbres){
    if (err) {
      console.log(err)
      delete Indexer.workers['update-media'][opts['hash']]
    } else {
      var probable = []

      if (typeof mdbres['results'] !== "undefined" && mdbres['results'].length) {
        probable = reduceMatchingMoviesByYear(mdbres['results'], year)
        probable = reduceMatchingMoviesByTitle(probable, title)
        var matching = reduceMatchingMoviesByPopularity(probable)

        if (typeof matching['id'] !== "undefined") {
          MovieDB.movieInfo({id: matching['id'] }, function(error, mdbinfo){
            if (error) {
              console.log(error)
              delete Indexer.workers['update-media'][opts['hash']]
            } else {
              opts['imdb'] = mdbinfo['imdb_id']
              cb(opts)
            }
          })
        } else {
          delete Indexer.workers['update-media'][opts['hash']]
        }
      } else {
        delete Indexer.workers['update-media'][opts['hash']]
      }
    }

  })
}

function reduceMatchingMoviesByYear(results, year) {
  var probable = []
  if (year > 1900) {
    for (var i = 0; i < results.length; ++i) {
      if (Math.abs(parseInt(results[i]['release_date'].substr(0, 4)) - year) <= 1) {
        probable.push(results[i])
      }
    }
    return probable
  } else {
    return results
  }
}

function reduceMatchingMoviesByTitle(results, title) {
  var probable = []

  title = title.toLowerCase()

  for (var i = 0; i < results.length; ++i) {
    if (results[i]['title'].toLowerCase() == title || results[i]['original_title'].toLowerCase() == title) {
      probable.push(results[i])
    }
  }

  return (probable.length) ? probable : results
}

function reduceMatchingMoviesByPopularity(results) {
  var probable = {},
    probable_i = -1,
    popularity = -1

  for (var i = 0; i < results.length; ++i) {
    if (results[i]['popularity'] > popularity) {
      probable_i = i
      popularity = results[i]['popularity']
      probable = results[i]
    }
  }

  return probable
}



/*
 function getMovieQualityRate($title) {
 $rate = 0;

 if (preg_match("/(?:dvd.?scr(?:eener)?)|(?:br.?scr(?:eener)?)|(?:bluray.?scr(?:eener)?)|(?:hdtv.?scr(?:eener)?)/", $title)) {
 $rate = 2;
 } else if (preg_match("/screener/", $title)) {
 $rate = 1;
 } else {
 if (preg_match("/(?:br.?rip)|(?:bd.?rip)|(?:bluray.?rip)|(?:bluray)/", $title)) {
 $rate = 7;
 } else if (preg_match("/(?:dvd.?rip)/", $title)) {
 $rate = 6;
 } else if (preg_match("/hdtv/", $title)) {
 $rate = 5;
 } else if (preg_match("/(?:web.?rip)/", $title)) {
 $rate = 4;
 } else if (preg_match("/rip/", $title)) {
 $rate = 3;
 }
 }

 return $rate;
 }

 function getTVShowQualityRate($title) {

 if (preg_match("/[[:space:]]1080p[[:space:]]/", $title)) {
 $rate = 5;
 } else if (preg_match("/[[:space:]]720p[[:space:]]/", $title)) {
 $rate = 4;
 } else if (preg_match("/[[:space:]]hdtv[[:space:]]/", $title)) {
 $rate = 3;
 } else if (preg_match("/[[:space:]]web.?(?:rip)?[[:space:]]/", $title)) {
 $rate = 2;
 } else if (preg_match("/[[:space:]]480p[[:space:]]/", $title)) {
 $rate = 1;
 } else {
 $rate = 0;
 }

 return $rate;
 }

 function getTVShowInfo($title) {
 $info = array('name' => '', 'episode' => -1);
 if (preg_match("/[[:space:]]s([0-9]+)e([0-9]+)[[:space:]]/", $title, $m, PREG_OFFSET_CAPTURE)) {
 $info['episode'] = intval($m[1][0]) * 1000 + intval($m[2][0]);
 $info['name'] = preg_replace('/[^a-z]/', '', substr($title, 0, $m[0][1]));
 } else if (preg_match("/[[:space:]]([0-9]+)x([0-9]+)[[:space:]]/", $title, $m, PREG_OFFSET_CAPTURE)) {
 $info['episode'] = intval($m[1][0]) * 1000 + intval($m[2][0]);
 $info['name'] = preg_replace('/[^a-z]/', '', substr($title, 0, $m[0][1]));
 } else if (preg_match("/[[:space:]]special[[:space:]]/", $title, $m, PREG_OFFSET_CAPTURE)) {
 $info['episode'] = 0; //special episode
 $info['name'] = 'special '.preg_replace('/[^a-z]/', '', substr($title, 0, $m[0][1]));
 } else {
 $info = false;
 }
 return $info;
 }
 */