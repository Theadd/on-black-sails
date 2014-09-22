/**
 * Created by Theadd on 22/09/2014.
 */

module.exports = {
  updatePeersOnRecent: {
    defaults: {
      'interval': 900000,
      'limit': false,
      'target': 'tracker',
      'prioritize': true
    },
    getQuery: function(options) {
      var fromDate = new Date(),
        toDate = new Date(),
        addedDate = new Date()

      fromDate.setHours(fromDate.getHours() - 2)
      toDate.setMinutes(toDate.getMinutes() - 15)
      addedDate.setHours(addedDate.getHours() - 24)

      console.log(options)

      console.log("==========================================")
      console.log("\tFrom date: " + fromDate)
      console.log("\tTo date: " + toDate)
      console.log("\tAdded date: " + addedDate)
      console.log("==========================================")

      var query = Hash.find({
        peersUpdatedAt: {'>': fromDate, '<': toDate},
        added: {'>': addedDate}
      })

      if (options.limit || false) {
        query = query.limit(options.limit)
      }

      return query
    }
  }
}

