"use strict";

var assign = require("lodash.assign");
var speedomatic = require("speedomatic");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");

var handleRPCError = function (returns, response) {
  if (response == null) return response; // should this be an error??
  if (response === "0x") return new RPCError({ error: "0x", message: "no response or bad input" }); // should this be an error??
  if (response.name != null && response.message != null && response.stack != null) {
    return new RPCError(assign({}, response, { error: response.name }));
  } else if (response.error != null) {
    return response;
  } else if (returns != null && returns.indexOf("[]") > -1 && response.length >= 194) {
    return "0x" + response.slice(130, 194);
  }
  return response;
};

module.exports = handleRPCError;
