/* global module, require */
/* jshint node: true, esversion: 6 */

/* Magic Mirror
 * Node Helper: MMM-MysqlQuery
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var mysql = require("mysql");


module.exports = NodeHelper.create({

    socketNotificationReceived: function(notification, payload) {
        var helper = this;
        if (notification === "MYSQLQUERY") {
            var con = mysql.createConnection({
                host: payload.host,
                port: payload.port,
                user: payload.user,
                password: payload.password,
                database: payload.database
            });

            con.connect(function(err) {
                if (err) throw err;
                con.query(payload.query, function(err, result) {
                    if (err) throw err;
                    helper.sendSocketNotification("MYSQLQUERY_RESULT", {
                        identifier: payload.identifier,
                        rows: result
                    });
                });
            });
        }
    }
});
