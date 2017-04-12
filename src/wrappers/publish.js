"use strict";

var eth = require("./eth");
var isFunction = require("../utils/is-function");

// publish a new contract to the blockchain from the coinbase account
function publish(compiled, callback) {
  return function (dispatch) {
    if (!isFunction(callback)) {
      return dispatch(eth.sendTransaction({ from: eth.coinbase(), data: compiled }));
    }
    eth.coinbase(function (coinbase) {
      eth.sendTransaction({ from: coinbase, data: compiled }, callback);
    });
  };
}

module.exports = publish;
