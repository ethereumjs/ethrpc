"use strict";

var abi = require("augur-abi");
var keccak_256 = require("js-sha3").keccak_256;
var isFunction = require("../../utils/is-function");

module.exports = function (data, isHex, callback) {
  var hash;
  if (isHex) data = abi.decode_hex(data);
  hash = abi.prefix_hex(keccak_256(data));
  if (!isFunction(callback)) return hash;
  callback(hash);
};
