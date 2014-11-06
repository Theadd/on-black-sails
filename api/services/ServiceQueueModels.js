/**
 * Created by Theadd on 22/09/2014.
 */

module.exports = {
  /** Predefined model that add items to TrackerService queue that had been updated by a TrackerService within the last
   * two hours and were added within last 24 hours. Used to keep torrent peers up to date for newly created ones since
   * its when they are more active. */
  updatePeersOnRecent: {
    config: {
      defaults: {
        standalone: true,
        type: 'tracker',
        interval: 900000,     //15min (REQUIRED).
        target: 'tracker',    //add items to TrackerService queue (REQUIRED).
        prioritize: true,     //prioritize items in the queue (OPTIONAL).
        skipRecentPool: true, //do not check service recent pool if items already exist (OPTIONAL).
        display: 'Peers (added within last 24h)',
        desc: 'Add items to TrackerService queue that had been recently updated by a TrackerService.',
        tooltip: 'Adds items to TrackerService queue that had been updated by a TrackerService within the last \
          two hours and were added within last 24 hours. Used to keep torrent peers up to date for \
          newly created ones since it is when they are more active.'
      }
    },
    getQuery: function() {
      var fromDate = new Date(),
        toDate = new Date(),
        addedDate = new Date()

      fromDate.setHours(fromDate.getHours() - 2)
      toDate.setMinutes(toDate.getMinutes() - 15)
      addedDate.setHours(addedDate.getHours() - 24)

      return Hash.find({
        peersUpdatedAt: {'>': fromDate, '<': toDate},
        added: {'>': addedDate}
      })
    }
  },
  /** Add items to MetadataService queue which aren't downloaded yet. */
  emptyMetadataQueue: {
    config: {
      defaults: {
        standalone: true,
        type: 'metadata',
        interval: 120000,
        target: 'metadata',
        display: 'Default metadata queuing model',
        desc: 'Add items to MetadataService queue which aren&apos;t downloaded yet.',
        tooltip: 'When set as a general autoqueue model for the entire process, queues 60 torrents each 120 seconds.'
      }
    },
    getQuery: function() {
      return Hash.find({
        where: { downloaded: false },
        sort: 'updatedAt ASC',
        limit: 60
      })
    }
  },
  /** Add items to StatusService which are already downloaded. */
  emptyStatusQueue: {
    config: {
      defaults: {
        standalone: true,
        type: 'status',
        interval: 120000,
        target: 'status',
        display: 'Default status queuing model',
        desc: 'Add items to StatusService which are already downloaded.',
        tooltip: 'When set as a general autoqueue model for the entire process, queues 60 torrents each 120 seconds.'
      }
    },
    getQuery: function() {
      return Hash.find()
        .where({ downloaded: true })
        .sort('updatedAt ASC')
        .where({category: { not: ["movies", "video movies"] } })
        .limit(60)
    },
    filter: function(entry) {
      TrackerService.queue(entry.uuid)
      return true
    }
  },
  /** Add items to MediaService which are already downloaded. */
  emptyMediaQueue: {
    config: {
      defaults: {
        standalone: true,    //Allowed as a global task, i.e. ServiceQueueModel.run('peers') is allowed.
        type: 'media',
        interval: 120000,
        target: 'media',
        display: 'Default media queuing model',
        desc: 'Add items to MediaService which are already downloaded.',
        tooltip: 'When set as a general autoqueue model for the entire process, queues 120 torrents each 120 seconds.'
      }
    },
    getQuery: function() {
      return Hash.find()
        .where({downloaded: true, category: ["movies", "video movies"] })
        .sort('updatedAt ASC')
        .limit(120)
    }
  },
  /** Add latest torrents with updated peers to PropagateService. */
  peers: {
    config: {
      defaults: {
        standalone: false,    //Not allowed as a global task, i.e. ServiceQueueModel.run('peers') is not allowed.
        type: 'agreement',    //Show only in agreement multi select
        stacksize: 15,        //Number of torrents propagated in each http request
        limit: 250,           //Number of torrents to queue each time the service pool is empty
        startAt: new Date(0), //Start propagating torrents with peersUpdatedAt greater than this date.
        interval: 3000,       //Interval between each http request to the remote node
        target: 'propagate',  //Add items to PropagateService queue.
        prioritize: false,     //Prioritize items in the queue.
        display: 'Peers',
        desc: 'Add latest torrents with updated peers to PropagateService.',
        tooltip: 'Sends stacks of 15 torrents every 3 seconds.'
      },
      heavy: {
        stacksize: 15,        //Number of torrents propagated in each http request
        limit: 500,           //Number of torrents to queue each time the service pool is empty
        interval: 500,       //Interval between each http request to the remote node
        display: 'Peers (Heavy)',
        desc: 'Add latest torrents with updated peers to PropagateService.',
        tooltip: 'Does the same as <strong>peers</strong> but sends stacks of 15 torrents each 0.5 seconds instead of 15 every 3 seconds.'
      }
    },
    getQuery: function(options) {

      return Hash.find()
        .where({ peersUpdatedAt: { '>=': options.startAt } })
        .sort('peersUpdatedAt ASC')
        .limit(options.limit)
    },
    filter: function(entry, options) {
      options.startAt = (options.startAt ||
        entry.peersUpdatedAt > options.startAt) ? entry.peersUpdatedAt : options.startAt

      return true
    }
  }
}
