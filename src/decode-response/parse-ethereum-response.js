"use strict";

var clone = require("clone");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");

var parseEthereumResponse = function (origResponse, returns, callback) {
  var results, len, err, i, response;
  response = clone(origResponse);
  // if ((debug.tx && (response && response.error)) || debug.broadcast) {
  //   console.log("[ethrpc] response:", response);
  // }
  if (response && typeof response === "string") {
    try {
      response = JSON.parse(response);
    } catch (e) {
      err = e;
      if (e && e.name === "SyntaxError") err = errors.INVALID_RESPONSE;
      if (isFunction(callback)) return callback(err);
      throw new RPCError(err);
    }
  }
  if (response !== undefined && typeof response === "object" && response !== null) {
    if (response.error) {
      response = { error: response.error.code, message: response.error.message };
      if (!isFunction(callback)) return response;
      return callback(response);
    } else if (response.result !== undefined) {
      if (!isFunction(callback)) return response.result;
      return callback(response.result);
    } else if (Array.isArray(response) && response.length) {
      len = response.length;
      results = new Array(len);
      for (i = 0; i < len; ++i) {
        results[i] = response[i].result;
        if (response.error || (response[i] && response[i].error)) {
          // if (debug.broadcast) {
          if (isFunction(callback)) return callback(response.error);
          throw new RPCError(response.error);
          // }
        }
      }
      if (!isFunction(callback)) return results;
      return callback(results);
    }

    // no result or error field
    err = errors.NO_RESPONSE;
    err.bubble = response;
    if (isFunction(callback)) return callback(err);
    throw new RPCError(err);
  }
};

module.exports = parseEthereumResponse;
