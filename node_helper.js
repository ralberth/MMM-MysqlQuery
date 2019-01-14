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
                    if (err) {
                        con.destroy();
                        throw err;
                    }
                    helper.sendSocketNotification("MYSQLQUERY_RESULT", {
                        identifier: payload.identifier,
                        rows: result
                    });

                    helper.debuglog("Sending result: " + JSON.stringify(result, null, 2));
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
    }
});
