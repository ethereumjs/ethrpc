"use strict";

var assign = require("lodash").assign;
var errors = require("./codes");
var isObject = require("../utils/is-object");

function RPCError(err, data) {
  var instance;
  if (isObject(err)) {
    instance = new Error(err.message);
    instance.code = err.code;
  } else if (typeof err === "string") {
    if (errors[err] && errors[err].message) {
      instance = new Error(errors[err].message);
      instance.code = err;
    } else {
      instance = new Error(err);
    }
  }
  if (data != null) assign(instance, data);
  Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
  if (Error.captureStackTrace) Error.captureStackTrace(instance, RPCError);
  return instance;
}

RPCError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: Error,
    enumerable: false,
    writable: true,
    configurable: true,
  },
});

if (Object.setPrototypeOf) {
  Object.setPrototypeOf(RPCError, Error);
} else {
  RPCError.prototype = Error;
}

module.exports = RPCError;
