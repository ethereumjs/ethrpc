"use strict";

var speedomatic = require("speedomatic");
var errors = require("../errors/codes");

var handleRPCError = function (method, returns, response) {
  var i, len, responseNumber;
  if (!response) return response;
  if (Array.isArray(response)) {
    for (i = 0, len = response.length; i < len; ++i) {
      response[i] = handleRPCError(method, returns, response[i]);
    }
  } else if (response.name && response.message && response.stack) {
    response.error = response.name;
  } else if (!response.error) {
    if (returns && returns.indexOf("[]") > -1 && response.length >= 194) {
      response = "0x" + response.slice(130, 194);
    }
    if (errors[response]) {
      response = { error: response, message: errors[response] };
    } else if (returns !== "null" && returns !== "string" || (typeof response === "string" && response.slice(0, 2) === "0x")) {
      responseNumber = speedomatic.bignum(response, "string", true);
      if (responseNumber && errors[method] && errors[method][responseNumber]) {
        response = { error: responseNumber, message: errors[method][responseNumber] };
      }
    }
  }
  return response;
};

module.exports = handleRPCError;
