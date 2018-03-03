"use strict";

var isObject = require("../utils/is-object");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");

function parseEthereumResponse(response, callback) {
  if (!isObject(response)) return callback(new Error(JSON.stringify(response)));
  if (response.error != null) return callback(new RPCError(response.error));
  if (response.result === undefined) return callback(new RPCError(errors.NO_RESPONSE));
  callback(null, response.result);
}

module.exports = parseEthereumResponse;
