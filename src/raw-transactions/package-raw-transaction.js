"use strict";

var assign = require("lodash").assign;
var speedomatic = require("speedomatic");
var packageRequest = require("../encode-request/package-request");

/**
 * Package a raw transaction.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @param {number} networkID The network (chain) ID to which the transaction will be submitted.
 * @param {function} callback Callback function.
 * @return {Object} Packaged transaction.
 */
function packageRawTransaction(payload, address, networkID, callback) {
  return function (dispatch, getState) {
    dispatch(packageRequest(assign({}, payload, { from: address }), function (err, packaged) {
      if (err) return callback(err);
      packaged.nonce = payload.nonce || 0;
      if (networkID && speedomatic.encodeNumberAsJSNumber(networkID) > 0 && speedomatic.encodeNumberAsJSNumber(networkID) < 109) {
        packaged.chainId = speedomatic.encodeNumberAsJSNumber(networkID);
      }
      if (getState().debug.tx) console.log("[ethrpc] packaged raw transaction", JSON.stringify(packaged, null, 2));
      callback(null, packaged);
    }));
  };
}

module.exports = packageRawTransaction;
