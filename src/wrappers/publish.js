"use strict";

var eth = require("./eth");
var constants = require("../constants");

// publish a new contract to the blockchain from the coinbase account
function publish(compiled, callback) {
  return function (dispatch) {
    dispatch(eth.coinbase(function (err, coinbase) {
      if (err) return callback(err);
      dispatch(eth.sendTransaction({ from: coinbase, data: compiled, gas: constants.DEFAULT_GAS }, callback));
    }));
  };
}

module.exports = publish;
