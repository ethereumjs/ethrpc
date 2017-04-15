"use strict";

/**
 * Check whether a string is a valid hexadecimal number.
 * @param {string} str String to validate.
 * @return {boolean} True if the string is valid hex, false otherwise.
 */
module.exports = function (str) {
  if (str.length % 2 === 0 && str.match(/^[0-9a-f]+$/i)) return true;
  return false;
};
