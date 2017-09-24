"use strict";

var speedomatic = require("speedomatic");
var eth_coinbase = require("./eth").coinbase;
var isFunction = require("../utils/is-function");

function setCoinbase(callback) {
  return function (dispatch) {
    dispatch(eth_coinbase(null, function (coinbase) {
      if (coinbase != null && !coinbase.error) {
        dispatch({ type: "SET_COINBASE", address: speedomatic.formatEthereumAddress(coinbase) });
      }
      if (isFunction(callback)) callback(null);
    }));
  };
}

module.exports = setCoinbase;
