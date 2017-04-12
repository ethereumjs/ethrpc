"use strict";

var eth = require("./eth");

// publish a new contract to the blockchain from the coinbase account
function publish(compiled, f) {
  return function (dispatch, getState) {
    if (!isFunction(f)) {
      return dispatch(eth.sendTransaction({ from: eth.coinbase(), data: compiled }));
    }
    eth.coinbase(function (coinbase) {
      eth.sendTransaction({ from: coinbase, data: compiled }, f);
    });
  };
}

module.exports = publish;
