"use strict";

var speedomatic = require("speedomatic");
var eth_coinbase = require("./eth").coinbase;

function setCoinbase(callback) {
  return function (dispatch) {
    dispatch(eth_coinbase(null, function (err, coinbase) {
      if (err) return callback(err);
      if (coinbase != null) {
        dispatch({ type: "SET_COINBASE", address: speedomatic.formatEthereumAddress(coinbase) });
      }
      callback(null);
    }));
  };
}

module.exports = setCoinbase;
