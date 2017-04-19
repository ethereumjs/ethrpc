"use strict";

var makeWrapper = require("./make-wrapper");

module.exports = {
  post: makeWrapper("shh_post"),
  version: makeWrapper("shh_version"),
  newIdentity: makeWrapper("shh_newIdentity"),
  hasIdentity: makeWrapper("shh_hasIdentity"),
  newGroup: makeWrapper("shh_newGroup"),
  addToGroup: makeWrapper("shh_addToGroup"),
  newFilter: makeWrapper("shh_newFilter"),
  uninstallFilter: makeWrapper("shh_uninstallFilter"),
  getFilterChanges: makeWrapper("shh_getFilterChanges"),
  getMessages: makeWrapper("shh_getMessages")
};
