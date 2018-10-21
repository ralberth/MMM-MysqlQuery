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
                if (err) throw err;
                con.query(payload.query, function(err, result) {
                    if (err) throw err;
                    helper.sendSocketNotification("MYSQLQUERY_RESULT", {
                        identifier: payload.identifier,
                        rows: result
                    });
                    helper.debuglog("Sending result: " + JSON.stringify(result, null, 2));
                });
            });
        }
    }
});
