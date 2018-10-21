/* global Module */

/* MMM-MysqlQuery.js
 *
 * Magic Mirror
 * Module: MMM-MysqlQuery
 * MIT Licensed.
 *
 * See README.md for details on this.
 */
Module.register("MMM-MysqlQuery", {

    debuglog: function(msg) {
        //console.log("[DEBUG][MMM-MysqlQuery] " + msg);
    },

    start: function() {
        this.debuglog("Starting up");
        var me = this;
        var c = this.config;
        this.validate(c.query,               "query",               [ "notnull" ]);
        this.validate(c.intervalSeconds,     "intervalSeconds",     [ "notnull", "positive" ]);
        this.validate(c.emptyMessage,        "emptyMessage",        [ "notnull" ]);

        this.validate(c.connection,          "connection",          [ "notnull" ]);
        this.validate(c.connection.host,     "connection.host",     [ "notnull" ]);
        this.validate(c.connection.port,     "connection.port",     [ "notnull", "positive" ]);
        this.validate(c.connection.database, "connection.database", [ "notnull" ]);

        this.validate(c.columns,             "columns",             [ "notnull" ]);
        this.validate(c.columns.length,      "columns length",      [ "notnull", "positive" ]);
        c.columns.forEach(function(col, indx) {
            var realIndex = indx + 1; // so error messages show 1st as "1"
            me.validate(col.name,       "columns[" + realIndex + "].name",       [ "notnull" ]);
            me.validate(col.precision,  "columns[" + realIndex + "].precision",  [ "nonnegative" ]);
        });
    },


    validate: function(val, name, tests) {
        var me = this;
        tests.forEach(function(test) {
            switch(test) {
            case "notnull":     me.assert(val,                        name + " cannot be null");          break;
            case "notempty":    me.assert(!val || val.length,         name + " cannot be empty");         break;
            case "positive":    me.assert(!val || parseInt(val) >= 1, name + " must be 1 or greater");    break;
            case "nonnegative": me.assert(!val || parseInt(val) >= 0, name + " must be zero or greater"); break;
            }
        });
    },


    assert: function(test, msg) {
        if (!test) throw new Error(msg);
    },


    getStyles: function() {
        return [ "MMM-MysqlQuery.css" ];
    },


    getDom: function() {
        this.topDiv = this.createEle(null, "div", "mysqlQuery");
        var table = this.createEle(this.topDiv, "table");
        var thead = this.createEle(table, "thead");
        var tr = this.createEle(thead, "tr");
        var helper = this;
        this.config.columns.forEach(function(col) {
            helper.createEle(tr, "th", null, col.title || col.name);
        });
        this.tbody = this.createEle(table, "tbody");

        return this.topDiv;
    },


    createEle: function(parentEle, eleType, name, innerHtml) {
        var div = document.createElement(eleType);
        if (name) {
            div.className = name;
        }
        if (innerHtml) {
            div.innerHTML = innerHtml;
        }
        if (parentEle) {
            parentEle.appendChild(div);
        }
        return div;
    },


    notificationReceived: function(notification, payload, sender) {
        switch(notification) {
        case "DOM_OBJECTS_CREATED":
            this.debuglog("Received notification " + notification + ", payload=" + payload + ", from " + sender);
            this.triggerHelper();
            this.startTimer();
            break;
        }
    },


    triggerHelper: function() {
        this.debuglog("Sending MYSQLQUERY id=" + this.identifier + ", query=" + this.config.query);
        this.sendSocketNotification("MYSQLQUERY", {
            identifier: this.identifier,
            connection: this.config.connection,
            query:      this.config.query
        });
    },


    startTimer: function() {
        var self = this;
        if (! this.timer) {
            this.debuglog("Start timer");
            this.timer = setInterval(
                function() { self.triggerHelper(); },
                self.config.intervalSeconds * 1000
            );
        }
    },


    socketNotificationReceived: function(notification, payload) {
        if (payload.identifier === this.identifier) {
            switch(notification) {
            case "MYSQLQUERY_RESULT":
                this.replaceTableRows(this.tbody, payload.rows);
                break;
            }
        }
    },


    replaceTableRows: function(parent, rowsToAdd) {
        this.debuglog("Replacing table with new server results:");
        var helper = this;
        while (parent.firstChild) parent.removeChild(parent.firstChild);
        if (rowsToAdd && rowsToAdd.length) {
            rowsToAdd.forEach(function(dbRow) {
                helper.debuglog("   Adding row to table: " + JSON.stringify(dbRow, null, 2));
                var tr = helper.createEle(parent, "tr");
                helper.config.columns.forEach(function(colDef) {
                    var rawVal = dbRow[colDef.name];
                    var displayVal = helper.formatCell(rawVal, colDef);
                    helper.debuglog("      Col " + colDef.name + ": raw value=\"" + rawVal +
                                    "\", display value=\"" + displayVal + "\"");
                    var td = helper.createEle(tr, "td", colDef.cssClass);
                    if (colDef.displayType == "html") {
                        td.innerHTML = displayVal;
                    } else {
                        td.innerText = displayVal;
                    }
                });
            });
        } else {
            this.debuglog("   No rows returned");
            if (helper.config.emptyMessage) {
                var tr = helper.createEle(parent, "tr");
                var td = helper.createEle(tr, "td");
                td.colSpan = helper.config.columns.length;
                td.innerHTML = helper.config.emptyMessage;
            }
        }
    },


    formatCell: function(value, cellConf) {
        if (value) {
            if (cellConf.precision) {
                value = value.toFixed(cellConf.precision);
            }

            if (cellConf.thousandsSeparator) {
                value = this.addSeparators(value, cellConf.thousandsSeparator);
            }

            switch (cellConf.dateFormat) {
            case "date":
                value = new Date(value).toLocaleDateString(cellConf.dateLocale);
                break;
            case "time":
                value = new Date(value).toLocaleTimeString(cellConf.dateLocale);
                break;
            case "datetime":
                value = new Date(value).toLocaleString(cellConf.dateLocale);
                break;
            }

            if (cellConf.prefix) {
                value = cellConf.prefix + value;
            }

            if (cellConf.suffix) {
                value = value + cellConf.suffix;
            }
        } else if (cellConf.nullValue) {
            value = cellConf.nullValue;
        }

        return value;
    },


    // http://www.mredkj.com/javascript/numberFormat.html
    addSeparators: function(nStr, sep) {
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + sep + '$2');
        }
        return x1 + x2;
    },


    suspend: function() {
        if (!!this.timer) {
            this.debuglog("Suspending");
            clearInterval(this.timer);
            this.timer = null;
        }
    },


    resume: function() {
        this.triggerHelper();
        this.startTimer();
        this.debuglog("Resuming");
    }
});
