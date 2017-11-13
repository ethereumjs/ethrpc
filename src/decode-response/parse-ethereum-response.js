"use strict";

var clone = require("clone");
var isFunction = require("../utils/is-function");
var isObject = require("../utils/is-object");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");

function parseEthereumResponse(origResponse, callback) {
  var results, len, err, i, response = clone(origResponse);
  if (isObject(response)) {
    if (response.error) {
      response = { error: response.error.code, message: response.error.message };
      if (!isFunction(callback)) return response;
      return callback(response);
    } else if (Array.isArray(response) && response.length) {
      len = response.length;
      results = new Array(len);
      for (i = 0; i < len; ++i) {
        results[i] = response[i].result;
        if (response.error || (response[i] && response[i].error)) {
          if (isFunction(callback)) return callback(response.error);
          throw new RPCError(response.error);
        }
      }
      if (!isFunction(callback)) return results;
      return callback(results);
    } else if (response.result !== undefined) {
      if (!isFunction(callback)) return response.result;
      return callback(response.result);
    }

    // no result or error field
    err = errors.NO_RESPONSE;
    err.bubble = response;
    if (isFunction(callback)) return callback(err);
    throw new RPCError(err);
  } else {
    throw new RPCError(JSON.stringify(response));
  }
}

module.exports = parseEthereumResponse;
