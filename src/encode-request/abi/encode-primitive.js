"use strict";

var encodeArray = require("./encode-array");
var encodeNumber = require("./encode-number");
var encodeObject = require("./encode-object");
var isFunction = require("../../utils/is-function");

var encodePrimitive = function (primitive) {
  if (typeof primitive === "undefined") return primitive;
  if (primitive === null) return primitive;
  if (typeof primitive === "boolean") return primitive;
  if (typeof primitive === "string") return primitive;
  if (typeof primitive === "number") return encodeNumber(primitive);
  if (primitive instanceof Array) return encodeArray(primitive);
  if (typeof primitive === "object") return encodeObject(primitive);
  if (isFunction(primitive)) throw new Error("Cannot encode a function to be sent to Ethereum.");
  throw new Error("Attempted to encode an unsupported type: " + typeof primitive);
};

module.exports = encodePrimitive;
