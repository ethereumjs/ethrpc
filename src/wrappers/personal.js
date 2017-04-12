"use strict";

var makeWrapper = require("./make-wrapper");

module.exports = {
  listAccounts: makeWrapper("personal_listAccounts"),
  unlockAccount: makeWrapper("personal_unlockAccount"),
  lockAccount: makeWrapper("personal_lockAccount")
};
