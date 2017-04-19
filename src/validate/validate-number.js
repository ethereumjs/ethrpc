"use strict";

var validateNumber = function (number, parameterName) {
  if (!parameterName) parameterName = "number";
  if (number === null) return number;
  if (number === undefined) return number;
  if (typeof number === "number") return "0x" + number.toString(16);
  if (typeof number === "string" && /^0x[0-9a-zA-Z]+$/.test(number)) return number;
  throw new Error(parameterName, " must be a number, null, undefined or a 0x prefixed hex encoded string");
};

module.exports = validateNumber;
