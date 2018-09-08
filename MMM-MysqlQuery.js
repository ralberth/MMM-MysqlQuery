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

    defaults: {
        hostname: "localhost",
        port: 3306,
        database: 'mysql',
        intervalSeconds: 60 * 10
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
            helper.createEle(tr, "th", null, col.title);
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
            this.triggerHelper();
            this.startTimer();
            break;
        }
    },


    triggerHelper: function() {
        this.sendSocketNotification("MYSQLQUERY", {
            identifier: this.identifier,
            host:       this.config.host,
            port:       this.config.port,
            user:       this.config.user,
            password:   this.config.password,
            database:   this.config.database,
            query:      this.config.query,
            columns:    this.config.columns
        });
    },


    startTimer: function() {
        var self = this;
        if (! this.timer) {
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
        var helper = this;
        while (parent.firstChild) parent.removeChild(parent.firstChild);
        if (rowsToAdd && rowsToAdd.length) {
            rowsToAdd.forEach(function(dbRow) {
                var tr = helper.createEle(parent, "tr");
                helper.config.columns.forEach(function(colDef) {
                    var displayVal = helper.formatCell(dbRow[colDef.name], colDef);
                    helper.createEle(tr, "td", colDef.cssClassFormat, displayVal);
                });
            });
        } else {
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
            clearInterval(this.timer);
            this.timer = null;
        }
    },


    resume: function() {
        this.triggerHelper();
        this.startTimer();
    }
});
