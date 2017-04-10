"use strict";

var encodeNumber = function (number) {
  if (typeof number !== "number") throw new Error("number must be a number.");
  return "0x" + number.toString(16);
};

module.exports = encodeNumber;
