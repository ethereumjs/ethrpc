"use strict";

var abi = require("augur-abi");
var createKeccakHash = require("keccak/js");
var isFunction = require("../utils/is-function");

module.exports = function (data, encoding, callback) {
  var hash, buffer;
  if (callback === undefined && isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }
  if (encoding === "hex") data = abi.strip_0x(data);
  buffer = Buffer.from(data, encoding);
  hash = abi.hex(createKeccakHash("keccak256").update(buffer).digest());
  if (!isFunction(callback)) return hash;
  callback(hash);
};
