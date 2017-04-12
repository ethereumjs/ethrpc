"use strict";

var makeWrapper = require("./make-wrapper");

module.exports = {
  newFilter: makeWrapper("shh_newFilter"),
  getFilterChanges: makeWrapper("shh_getFilterChanges"),
  uninstallFilter: makeWrapper("shh_uninstallFilter")
};
