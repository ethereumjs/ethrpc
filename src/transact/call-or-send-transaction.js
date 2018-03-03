"use strict";

var eth = require("../wrappers/eth");
var packageRequest = require("../encode-request/package-request");
var isObject = require("../utils/is-object");
var RPCError = require("../errors/rpc-error");

function callOrSendTransaction(payload, callback) {
  return function (dispatch, getState) {
    if (!isObject(payload)) return callback(new RPCError("TRANSACTION_FAILED"));
    try {
      var packaged = packageRequest(payload);
    } catch (err) {
      return callback(err);
    }
    if (getState().debug.broadcast) console.log("packaged:", packaged);
    if (payload.estimateGas) {
      dispatch(eth.estimateGas(packaged, callback));
    } else if (payload.send) {
      dispatch(eth.sendTransaction(packaged, callback));
    } else {
      dispatch(eth.call([packaged, "latest"], callback));
    }
  };
}

module.exports = callOrSendTransaction;
