#!/usr/bin/env node

var chalk = require("chalk");
var assert = require("chai").assert;
var contracts = require("augur-contracts")['7'];
var rpc = require("../src");

var log = function (label, res) {
  console.log(
    chalk.cyan(label + ":"),
    chalk.white.dim(JSON.stringify(res, null, 2))
  );
};

var tx = {
  to: contracts.faucets,
  from: rpc.coinbase(),
  method: "reputationFaucet",
  signature: "i",
  params: "0xf69b5",
  returns: "number"
};

var callbacks = {
  onSent: function (res) {
    log("sent", res);
  },
  onSuccess: function (res) {
    log("success", res);
    assert(false);
  },
  onFailed: function (res) {
    log("failed", res.message);
    console.log(res.stack);
  }
};

rpc.transact(tx, callbacks.onSent, callbacks.onSuccess, callbacks.onFailed);
