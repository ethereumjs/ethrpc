"use strict";

var abi = require("augur-abi");
var eth_coinbase = require("./eth").coinbase;

function setCoinbase() {
  return function (dispatch) {
    dispatch(eth_coinbase(null, function (coinbase) {
      if (coinbase != null && !coinbase.error) {
        dispatch({ type: "SET_COINBASE", address: abi.format_address(coinbase) });
      }
    }));
  };
}

module.exports = setCoinbase;
