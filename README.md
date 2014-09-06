on-black-sails!
===========
### [Structure](#structure) &nbsp; [Services/Tasks](#configuration) &nbsp; [Installation](#installation)

Using sails.js framework, **on-black-sails** provides a Restful API of indexed torrents from public trackers on the net. Those indexed torrents are being fetched and updated by several tasks, each task is implemented as an [ipc-service](https://github.com/Theadd/ipc-service).

## Structure
on-black-sails is not a client-server architecture, it can be composed of several independent running processes acting on their own. Each process can (specified using the command line) handle none, one or multiple tasks/services and does not depend on other processes that handle other tasks to be running at the same time.

## Services/Tasks
* **MediaService.js**: Gathers movie torrents related data from "imdb.com"
* **MetadataService.js**: Downloads each .torrent file and gets its metadata
* **StatusService.js**: Updates fake status of indexed torrents
* **TrackerService.js**: Updates seeds/peers/etc from trackers.
* **PropagateService.js**: Propagates indexed torrents which its *peers* data has been updated recently.

## Installation
* `git clone https://github.com/Theadd/on-black-sails.git`
* Edit `config/connections.js` to meet your mongodb server parameters.
* ...
