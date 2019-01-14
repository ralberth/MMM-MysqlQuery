/* global module, require */
/* jshint node: true, esversion: 6 */

/* Magic Mirror
 * Node Helper: MMM-MysqlQuery
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var mysql = require("mysql");


module.exports = NodeHelper.create({

    debuglog: function(msg) {
        //console.log("[DEBUG][MMM-MysqlQuery] " + msg);
    },


    socketNotificationReceived: function(notification, payload) {
        var helper = this;
        if (notification === "MYSQLQUERY") {
            this.debuglog("Received " + JSON.stringify(payload, null, 2));
            var con = mysql.createConnection(payload.connection);
            con.connect(function(err) {
                if (err) {
                    con.destroy();
                    throw err;
                }

                con.query(payload.query, function(err, result) {
                    helper.debuglog("Received from MySQL: " + JSON.stringify(result, null, 2));

                    if (err) {
                        con.destroy();
                        throw err;
                    }

                    var arrayForBrowser = helper.flattenResultSets(result);
                    helper.sendSocketNotification("MYSQLQUERY_RESULT", {
                        identifier: payload.identifier,
                        rows: arrayForBrowser
                    });

                    helper.debuglog("Sending result: " + JSON.stringify(arrayForBrowser, null, 2));
                });
            });

            /*
             * Annoying part of Socket.io used by MM core logic: it doesn't support promise chaining, so you
             * can't put a promise on the completion of sendSocketNofication() above.  You can't just call
             * con.destroy() here, or the connection to the database will be closed *before* the data has been
             * consumed and sent to the browser!  So, we have a total HACK here: wait a few seconds for the
             * data to presumably be sent, then close the connection.  YES, this is a race condition.  LOSE.
             */
            setTimeout(
                function(con) {
                    helper.debuglog("Destroying unneeded SQL connection");
                    con.destroy();
                },
                10000,
                con
            );
        }
    },


    /*
     * Special case: if we received more than one result back, combine them
     * together and emit as a single result set.  If there is a Summary returned
     * at the end, strip it off (usually from a CALL invocation instead of a
     * SELECT invocation).
     *
     * CALL emits an object that looks like this at the end of the results:
     * { "fieldCount": 0, "affectedRows": 0, "insertId": 0, "serverStatus": 34, "warningCount": 1, "message": "",
     *   "protocol41": true, "changedRows": 0 }
     */
    flattenResultSets: function(results) {
        ret = []

        for(var thing of results)
            if (Array.isArray(thing))
                ret = ret.concat(thing);
            else if (! this.isSummaryObject(thing))
                ret.push(thing);

        return ret;
    },


    isSummaryObject: function(thing) {
        return "fieldCount"   in thing &&
               "affectedRows" in thing &&
               "insertId"     in thing &&
               "serverStatus" in thing; // close enough :-)
    }
});
