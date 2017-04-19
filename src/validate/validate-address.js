"use strict";

var validateAddress = function (address) {
  if (address === null || address === undefined) {
    throw new Error("address is required");
  }
  if (typeof address !== "string") {
    throw new Error("address must be a string but was " + typeof address);
  }
  // fixup malformed addresses
  if (/^[0-9a-fA-F]*$/.test(address)) {
    address = "0x" + address;
  }
  if (!/^0x[0-9a-fA-F]*$/.test(address)) {
    throw new Error("address can only contain 0-9 and a-Z and must start with 0x.  Provided: " + address);
  }
  if (address.length !== 42) {
    throw new Error("address must be 42 characters, 20 bytes (2 hex encoded code points each) plus the 0x prefix.  Length: " + address.length);
  }
  return address;
};

module.exports = validateAddress;
