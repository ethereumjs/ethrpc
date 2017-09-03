"use strict";

var speedomatic = require("speedomatic");
var eth_coinbase = require("./eth").coinbase;

function setCoinbase() {
  return function (dispatch) {
    dispatch(eth_coinbase(null, function (coinbase) {
      if (coinbase != null && !coinbase.error) {
        dispatch({ type: "SET_COINBASE", address: speedomatic.formatEthereumAddress(coinbase) });
      }
    }));
  };
}

module.exports = setCoinbase;
