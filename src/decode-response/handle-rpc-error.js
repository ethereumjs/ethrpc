"use strict";

var assign = require("lodash.assign");
var RPCError = require("../errors/rpc-error");

// TODO is this needed...?
var handleRPCError = function (returns, rpcError) {
  if (rpcError == null || rpcError === "0x") return new RPCError({ error: "0x", message: "no response or bad input" });
  if (rpcError.name != null && rpcError.message != null && rpcError.stack != null) {
    return new RPCError(assign({}, rpcError, { error: rpcError.name }));
  } else if (rpcError.error != null) {
    return rpcError;
  } else if (returns != null && returns.indexOf("[]") > -1 && rpcError.length >= 194) {
    return "0x" + rpcError.slice(130, 194);
  }
  return rpcError;
};

module.exports = handleRPCError;
