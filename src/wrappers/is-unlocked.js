"use strict";

var eth_sign = require("../wrappers/eth").sign;
var isFunction = require("../utils/is-function");

/**
 * Check to see if the provided account is unlocked for the connected node.
 */
function isUnlocked(account, callback) {
  return function (dispatch) {
    var res;
    try {
      if (isFunction(callback)) {
        dispatch(eth_sign([account, "0x00000000000000000000000000000000000000000000000000000000000f69b5"], function (res) {
          if (!res || res.error) return callback(false);
          callback(true);
        }));
      } else {
        res = dispatch(eth_sign([account, "0x00000000000000000000000000000000000000000000000000000000000f69b5"]));
        if (!res || res.error) return false;
        return true;
      }
    } catch (e) {
      if (!isFunction(callback)) return false;
      callback(false);
    }
  };
}

module.exports = isUnlocked;
