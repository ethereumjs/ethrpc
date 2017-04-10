"use strict";

var encodeNumber = function (number) {
  if (typeof number !== "number") throw new Error("number must be a number.");
  var numberAsHexString = number.toString(16);
  return "0x" + numberAsHexString;
};

module.exports = encodeNumber;
