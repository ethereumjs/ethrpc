"use strict";

var makeWrapper = require("./make-wrapper");
var sha3 = require("../utils/sha3");

module.exports = {
  sha3: function (data, encoding, callback) {
    return function () {
      return sha3(data, encoding, callback);
    };
  },
  clientVersion: makeWrapper("web3_clientVersion")
};
