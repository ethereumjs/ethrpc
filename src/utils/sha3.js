"use strict";

var speedomatic = require("speedomatic");
var createKeccakHash = require("keccak/js");
var isFunction = require("../utils/is-function");

module.exports = function (data, encoding, callback) {
  if (callback === undefined && isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }
  if (encoding === "hex") data = speedomatic.strip0xPrefix(data);
  // if (data.length % 2 !== 0) data = "0" + data;
  var buffer = Buffer.from(data, encoding);
  var hash = speedomatic.hex(createKeccakHash("keccak256").update(buffer).digest());
  if (!isFunction(callback)) return hash;
  callback(hash);
};
