"use strict";

var abi = require("augur-abi");
var errors = require("../errors/codes");

var handleRPCError = function (method, returns, response) {
  var i, len, responseNumber;
  if (response) {
    if (response.constructor === Array) {
      for (i = 0, len = response.length; i < len; ++i) {
        response[i] = handleRPCError(method, returns, response[i]);
      }
    } else if (response.name && response.message && response.stack) {
      response.error = response.name;
    } else if (!response.error) {
      if (returns && returns.indexOf("[]") > -1) {
        if (response.length >= 194) {
          response = "0x" + response.slice(130, 194);
        }
      }
      if (errors[response]) {
        response = {
          error: response,
          message: errors[response]
        };
      } else if (returns !== "null" && returns !== "string" || (response && response.constructor === String && response.slice(0, 2) === "0x")) {
        responseNumber = abi.bignum(response, "string", true);
        if (responseNumber) {
          if (errors[method] && errors[method][responseNumber]) {
            response = {
              error: responseNumber,
              message: errors[method][responseNumber]
            };
          }
        }
      }
    }
  }
  return response;
};

module.exports = handleRPCError;
