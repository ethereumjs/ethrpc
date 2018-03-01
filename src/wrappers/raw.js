"use strict";

var submitRequestToBlockchain = require("../rpc/submit-request-to-blockchain");
var makeRequestPayload = require("../encode-request/make-request-payload");

function raw(command, params, callback) {
  return function (dispatch) {
    return dispatch(submitRequestToBlockchain(makeRequestPayload(command, params, null), callback));
  };
}

module.exports = raw;
