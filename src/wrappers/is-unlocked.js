"use strict";

var eth_sign = require("../wrappers/eth").sign;

/**
 * Check to see if the provided account is unlocked for the connected node.
 */
function isUnlocked(account, callback) {
  return function (dispatch) {
    dispatch(eth_sign([account, "0x00000000000000000000000000000000000000000000000000000000000f69b5"], function (err) {
      if (err) {
        console.warn("eth_sign failed during ethrpc.isUnlocked:", err);
        return callback(null, false);
      }
      callback(null, true);
    }));
  };
}

module.exports = isUnlocked;
