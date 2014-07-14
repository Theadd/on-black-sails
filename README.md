# on-black-sails
===========

## Initial Setup
* `git clone https://github.com/Theadd/on-black-sails.git`
* Edit `config/connections.js` to meet your mongodb server parameters.
* Start a mongo client to prepare the database and collection with the following:
```
use onblacksails
db.hash.ensureIndex({uuid: 1}, { unique: true })
db.hash.ensureIndex({downloaded: 1, updatedAt: 1})
db.hash.ensureIndex({title: "text"})
```
* Run `sails lift --update-index` and kill it when there is no more output for a while.
* Run `sails lift --update-metadata` and wait some minutes before killing it.
* At this point, your database should have some data we can work with, run `sails lift --update-index --update-metadata --update-status --update-media`.
