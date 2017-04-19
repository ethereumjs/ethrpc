"use strict";

var createEthrpc = require("./create-ethrpc");

var ethrpc = createEthrpc(require("./store"));
ethrpc.withCustomStore = createEthrpc;

module.exports = ethrpc;
