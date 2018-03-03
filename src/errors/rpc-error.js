"use strict";

var assign = require("lodash.assign");
var errors = require("./codes");
var isObject = require("../utils/is-object");

function RPCError(err, data) {
  if (isObject(err)) {
    assign(this, err);
  } else if (typeof err === "string") {
    assign(this, errors[err] || { message: err });
  }
  if (data) assign(this, data);
}

RPCError.prototype = Error.prototype;

module.exports = RPCError;
