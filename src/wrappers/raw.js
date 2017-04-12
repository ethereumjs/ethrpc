"use strict";

var submitRequestToBlockchain = require("../rpc/submit-request-to-blockchain");
var makeRequestPayload = require("../encode-request/make-request-payload");
var isFunction = require("../utils/is-function");

function raw(command, params, callback) {
  var transportRequirements = (isFunction(callback)) ? "ANY" : "SYNC";
  return submitRequestToBlockchain(makeRequestPayload(command, params, null), transportRequirements, callback);
}

module.exports = raw;
