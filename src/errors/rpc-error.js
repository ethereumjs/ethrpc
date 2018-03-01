"use strict";

var assign = require("lodash.assign");
var immutableDelete = require("immutable-delete");

function RPCError(err) {
  assign(this, immutableDelete(err, "code"), {
    name: "RPCError",
    error: err.error || err.code,
    message: err.message,
  });
}

RPCError.prototype = Error.prototype;

module.exports = RPCError;
