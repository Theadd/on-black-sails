/**
 * Created by Theadd on 6/16/14.
 */

var moviedbBusyState = false,
  moviedbBusySince = new Date().getTime(),
  MovieDB = null

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
  title = title.replace(/\W+/g," ");

  if (!moviedbBusyState) {
    moviedbBusyState = true
    moviedbBusySince = new Date().getTime()

    if (MovieDB == null) {
      MovieDB = require('moviedb')('d64e9dd43d0bc3187bb0254ccfe01257') //TODO: config/local.js
    }
    opts = opts || {}

    MovieDB.on('error', function(emsg) {
      console.log("@MOVIEDB: ", emsg)
      moviedbBusyState = false
    })

    MovieDB.searchMovie({query: title }, function(err, mdbres){
      if (err) {
        moviedbBusyState = false
        console.log(err)
        //delete Indexer.workers['update-media'][opts['hash']]
      } else {
        var probable = []

        if (typeof mdbres['results'] !== "undefined" && mdbres['results'].length) {
          probable = reduceMatchingMoviesByYear(mdbres['results'], year)
          probable = reduceMatchingMoviesByTitle(probable, title)
          var matching = reduceMatchingMoviesByPopularity(probable)
          if (typeof matching['id'] !== "undefined") {
            MovieDB.movieInfo({id: matching['id'] }, function(error, mdbinfo) {
              if (error) {
                moviedbBusyState = false
                //delete Indexer.workers['update-media'][opts['hash']]
              } else {
                opts['imdb'] = mdbinfo['imdb_id']
                cb(opts)
                moviedbBusyState = false
              }
            })
          } else {
            moviedbBusyState = false
            //delete Indexer.workers['update-media'][opts['hash']]
          }
        } else {
          moviedbBusyState = false
          //delete Indexer.workers['update-media'][opts['hash']]
        }
      }

    })
  } else {
    setTimeout( function() {
      if ((new Date().getTime()) - moviedbBusySince > 30000) {
        moviedbBusyState = false
      }
      MediaHelpers.matchingIMDBIDFromTMDB(title, year, cb, opts)
    }, 1000)

  }
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

