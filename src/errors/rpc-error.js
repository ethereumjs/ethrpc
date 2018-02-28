"use strict";

function RPCError(err) {
  this.name = "RPCError";
  this.error = err.error || err.code;
  this.message = err.message;
}

RPCError.prototype = Error.prototype;

module.exports = RPCError;
