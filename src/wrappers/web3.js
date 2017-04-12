"use strict";

var makeWrapper = require("./make-wrapper");
var sha3 = require("../utils/sha3");

module.exports = {
  sha3: sha3,
  clientVersion: makeWrapper("web3_clientVersion")
};
