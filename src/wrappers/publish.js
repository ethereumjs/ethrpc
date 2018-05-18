"use strict";

var eth = require("./eth");
var RPCError = require("../errors/rpc-error");

// publish a new contract to the blockchain from the coinbase account
function publish(compiled, callback) {
  return function (dispatch) {
    dispatch(eth.coinbase(function (err, coinbase) {
      if (err) return callback(err);
      if (coinbase == null) return callback(new RPCError("COINBASE_NOT_SET"));
      dispatch(eth.sendTransaction({ from: coinbase, data: compiled, gas: "0x5d1420" }, callback));
    }));
  };
}

module.exports = publish;
