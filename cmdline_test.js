/*
 * Sample invocation:
 *      % node cmdline_test.js  myhost.ddns.net 3306 myuser mypaswd mydb 'select 1, 2, 3'
 */
var mysql = require("mysql");

var con = mysql.createConnection({
    host: process.argv[2],
    port: process.argv[3],
    user: process.argv[4],
    password: process.argv[5],
    database: process.argv[6]
});

con.connect(function(err) {
    if (err) throw err;
    con.query(process.argv[7], function(err, result) {
        if (err) throw err;
        console.log(result);
    });
});
