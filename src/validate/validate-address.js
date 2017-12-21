"use strict";
const createKeccakHash = require("keccak/js");

function checksumAddress (address) {
  address = address.toLowerCase().slice(2);
  var hash = createKeccakHash('keccak256').update(address).digest('hex')
  var ret = '0x'

  for (var i = 0; i < address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += address[i].toUpperCase()
    } else {
      ret += address[i]
    }
  }

  return ret
}

var validateAddress = function (address) {
  if (address === null || address === undefined) {
    throw new Error("address is required");
  }
  if (typeof address !== "string") {
    throw new Error("address must be a string but was " + typeof address);
  }
  if (address.slice(0, 2) !== "0x") {
    address = "0x" + address;
  }
  if (address.length !== 42) {
    throw new Error("address must be 42 characters, 20 bytes (2 hex encoded code points each) plus the 0x prefix.  Length: " + address.length);
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("address can only contain 0-9 and a-F and must start with 0x.  Provided: " + address);
  }
  if (/[a-f]+/.test(address) && /[A-F]+/.test(address) && checksumAddress(address) !== address) {
    throw new Error("address checksum is invalid.");
  }
  return address;
};

module.exports = validateAddress;
