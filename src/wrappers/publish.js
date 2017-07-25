"use strict";

var eth = require("./eth");
var constants = require("../constants");
var isFunction = require("../utils/is-function");

// publish a new contract to the blockchain from the coinbase account
function publish(compiled, callback) {
  return function (dispatch) {
    if (!isFunction(callback)) {
      return dispatch(eth.sendTransaction({ from: dispatch(eth.coinbase()), data: compiled, gas: constants.DEFAULT_GAS }));
    }
    dispatch(eth.coinbase(function (coinbase) {
      dispatch(eth.sendTransaction({ from: coinbase, data: compiled, gas: constants.DEFAULT_GAS }, callback));
    }));
  };
}

module.exports = publish;
