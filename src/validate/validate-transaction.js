"use strict";

var validateAddress = require("./validate-address");
var validateNumber = require("./validate-number");

var validateTransaction = function (transaction) {
  if (!transaction) throw new Error("transaction is required");
  transaction.from = validateAddress(transaction.from);
  if (transaction.to !== undefined && transaction.to !== null) {
    transaction.to = validateAddress(transaction.to);
  }
  transaction.gas = validateNumber(transaction.gas, "gas");
  transaction.gasPrice = validateNumber(transaction.gasPrice, "gasPrice");
  transaction.value = validateNumber(transaction.value, "value");
  if (transaction.data !== undefined && transaction.data !== null && typeof transaction.data !== "string") {
    throw new Error("data must be a string");
  }
  if (!/^0x[0-9a-zA-Z]*$/.test(transaction.data)) {
    throw new Error("data must be a hex encoded string with a leader '0x'");
  }
  transaction.nonce = validateNumber(transaction.nonce, "nonce");
};

module.exports = validateTransaction;
