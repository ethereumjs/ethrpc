"use strict";

var abi = require("augur-abi");

/**
 * Check whether a string is a valid hexadecimal number.
 * @param {string} str String to validate.
 * @return {boolean} True if the string is valid hex, false otherwise.
 */
module.exports = function (str) {
  if (typeof str !== "string") return false;
  if (abi.strip_0x(str).match(/^[0-9a-f]+$/i)) return true;
  return false;
};
