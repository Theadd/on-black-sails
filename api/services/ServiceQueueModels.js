/**
 * Created by Theadd on 22/09/2014.
 */

//Example return value: Hash.find({ where: { title: 'foo' }, skip: 20, limit: 10, sort: 'title DESC' })
module.exports = {
  /** Predefined model that add items to TrackerService queue that had been updated by a TrackerService within the last
   * two hours and were added within last 24 hours. Used to keep torrent peers up to date for newly created ones since
   * its when they are more active. */
  updatePeersOnRecent: {
    defaults: {
      interval: 900000,     //15min (REQUIRED).
      target: 'tracker',    //add items to TrackerService queue (REQUIRED).
      prioritize: true,     //prioritize items in the queue (OPTIONAL).
      skipRecentPool: true  //do not check service recent pool if items already exist (OPTIONAL).
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
    defaults: {
      interval: 120000,
      target: 'metadata'
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
    defaults: {
      interval: 120000,
      target: 'status'
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
    defaults: {
      interval: 120000,
      target: 'status'
    },
    getQuery: function() {
      return Hash.find()
        .where({downloaded: true, category: ["movies", "video movies"] })
        .sort('updatedAt ASC')
        .limit(120)
    }
  }
}

