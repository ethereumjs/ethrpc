/**
 * JSON RPC methods for Ethereum
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var BigNumber = require("bignumber.js");

var getBlockAndLogStreamer = require("./block-management/get-block-and-log-streamer");
var ensureLatestBlock = require("./block-management/ensure-latest-block");
var waitForNextBlocks = require("./block-management/wait-for-next-blocks");

var packageAndSubmitRawTransaction = require("./raw-transactions/package-and-submit-raw-transaction");
var packageAndSignRawTransaction = require("./raw-transactions/package-and-sign-raw-transaction");
var packageRawTransaction = require("./raw-transactions/package-raw-transaction");
var signRawTransaction = require("./raw-transactions/sign-raw-transaction");

var packageRequest = require("./encode-request/package-request");

var validateAndDefaultBlockNumber = require("./validate/validate-and-default-block-number");
var validateTransaction = require("./validate/validate-transaction");

var callOrSendTransaction = require("./transact/call-or-send-transaction");
var callContractFunction = require("./transact/call-contract-function");
var transact = require("./transact/transact");

var registerTransactionRelay = require("./transaction-relay/register-transaction-relay");
var unregisterTransactionRelay = require("./transaction-relay/unregister-transaction-relay");
var excludeFromTransactionRelay = require("./transaction-relay/exclude-from-transaction-relay");
var includeInTransactionRelay = require("./transaction-relay/include-in-transaction-relay");

var sendEther = require("./wrappers/send-ether");
var publish = require("./wrappers/publish");

var raw = require("./wrappers/raw");
var wrappers = require("./wrappers");
var isUnlocked = require("./wrappers/is-unlocked");
var resendTransaction = require("./wrappers/resend-transaction");
var resendRawTransaction = require("./wrappers/resend-raw-transaction");

var isFunction = require("./utils/is-function");
var sha3 = require("./utils/sha3");

var errors = require("./errors/codes");

var clearTransactions = require("./clear-transactions");
var resetState = require("./reset-state");
var connect = require("./connect");
var store = require("./store");

BigNumber.config({
  MODULO_MODE: BigNumber.EUCLID,
  ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN
});

module.exports = {

  store: store,
  errors: errors,

  packageAndSubmitRawTransaction: packageAndSubmitRawTransaction,
  packageAndSignRawTransaction: packageAndSignRawTransaction,
  signRawTransaction: signRawTransaction,
  packageRawTransaction: packageRawTransaction,
  packageRequest: packageRequest,

  connect: function (configuration, initialConnectCallback) {
    return store.dispatch(connect(configuration, initialConnectCallback));
  },
  getBlockAndLogStreamer: function () { return store.dispatch(getBlockAndLogStreamer()); },
  clear: function () { return store.dispatch(clearTransactions()); },
  resetState: function () { return store.dispatch(resetState()); },

  registerTransactionRelay: function () { return store.dispatch(registerTransactionRelay()); },
  unregisterTransactionRelay: function () { return store.dispatch(unregisterTransactionRelay()); },
  excludeFromTransactionRelay: function (method) { return store.dispatch(excludeFromTransactionRelay(method)); },
  includeInTransactionRelay: function (method) { return store.dispatch(includeInTransactionRelay(method)); },

  /******************************
   * Ethereum JSON-RPC bindings *
   ******************************/

  raw: function (cmd, params, callback) { return store.dispatch(raw(cmd, params, callback)); },
  eth: function (cmd, params, callback) { return store.dispatch(raw("eth_" + cmd, params, callback)); },
  net: function (cmd, params, callback) { return store.dispatch(raw("net_" + cmd, params, callback)); },
  web3: function (cmd, params, callback) { return store.dispatch(raw("web3_" + cmd, params, callback)); },
  txpool: function (cmd, params, callback) { return store.dispatch(raw("txpool_" + cmd, params, callback)); },
  shh: function (cmd, params, callback) { return store.dispatch(raw("shh_" + cmd, params, callback)); },
  miner: function (cmd, params, callback) { return store.dispatch(raw("miner_" + cmd, params, callback)); },
  admin: function (cmd, params, callback) { return store.dispatch(raw("admin_" + cmd, params, callback)); },
  personal: function (cmd, params, callback) { return store.dispatch(raw("personal_" + cmd, params, callback)); },

  // web3_
  sha3: sha3,
  clientVersion: function (callback) { return store.dispatch(wrappers.web3.clientVersion(null, callback)); },

  // net_
  listening: function (callback) { return store.dispatch(wrappers.net.listening(null, callback)); },
  peerCount: function (callback) { return store.dispatch(wrappers.net.peerCount(null, callback)); },
  version: function (callback) { return store.dispatch(wrappers.net.version(null, callback)); },
  netVersion: function (callback) { return this.version(callback); },

  // eth_
  accounts: function (callback) { return store.dispatch(wrappers.eth.accounts(null, callback)); },
  blockNumber: function (callback) { return store.dispatch(wrappers.eth.blockNumber(null, callback)); },
  call: function (transaction, blockNumber, callback) {
    if (isFunction(blockNumber)) {
      callback = blockNumber;
      blockNumber = null;
    }
    return store.dispatch(wrappers.eth.call([transaction, validateAndDefaultBlockNumber(blockNumber)], callback));
  },
  coinbase: function (callback) { return store.dispatch(wrappers.eth.coinbase(null, callback)); },
  // compileLLL, compileSerpent, and compileSolidity intentionally left out
  estimateGas: function (transaction, blockNumber, callback) {
    if (isFunction(blockNumber)) {
      callback = blockNumber;
      blockNumber = null;
    }
    return store.dispatch(wrappers.eth.estimateGas([transaction, validateAndDefaultBlockNumber(blockNumber)], callback));
  },
  gasPrice: function (callback) { return store.dispatch(wrappers.eth.gasPrice(null, callback)); },
  getGasPrice: function (callback) { return this.gasPrice(callback); },
  getBalance: function (address, blockNumber, callback) {
    if (isFunction(blockNumber)) {
      callback = blockNumber;
      blockNumber = null;
    }
    return store.dispatch(wrappers.eth.getBalance([address, validateAndDefaultBlockNumber(blockNumber)], callback));
  },
  balance: function (address, blockNumber, callback) {
    return this.getBalance(address, blockNumber, callback);
  },
  getBlockByHash: function (hash, shouldReturnFullTransactions, callback) {
    if (shouldReturnFullTransactions === undefined) shouldReturnFullTransactions = true;
    return store.dispatch(wrappers.eth.getBlockByHash([hash, Boolean(shouldReturnFullTransactions)], callback));
  },
  getBlockByNumber: function (number, shouldReturnFullTransactions, callback) {
    if (shouldReturnFullTransactions !== true) shouldReturnFullTransactions = false;
    return store.dispatch(wrappers.eth.getBlockByNumber([validateAndDefaultBlockNumber(number), Boolean(shouldReturnFullTransactions)], callback));
  },
  getBlock: function (number, shouldReturnFullTransactions, callback) {
    return this.getBlockByNumber(number, shouldReturnFullTransactions, callback);
  },
  getCode: function (address, blockNumber, callback) {
    return store.dispatch(wrappers.eth.getCode([address, validateAndDefaultBlockNumber(blockNumber)], callback));
  },
  // TODO remove
  read: function (address, blockNumber, callback) {
    return this.getCode(address, blockNumber, callback);
  },
  getFilterChanges: function (filter, callback) {
    return store.dispatch(wrappers.eth.getFilterChanges([filter], callback));
  },
  getFilterLogs: function (filter, callback) {
    return store.dispatch(wrappers.eth.getFilterLogs(filter, callback));
  },
  getLogs: function (filter, callback) {
    return store.dispatch(wrappers.eth.getLogs(filter, callback));
  },
  // TODO: add map lookup support (at the moment, this function doesn't support
  // map lookups due to rounding errors after 51-bits for JS numbers)
  getStorageAt: function (address, position, blockNumber, callback) {
    return store.dispatch(wrappers.eth.getStorageAt([address, position, validateAndDefaultBlockNumber(blockNumber)], callback));
  },
  getTransactionByHash: function (transactionHash, callback) {
    return store.dispatch(wrappers.eth.getTransactionByHash([transactionHash], callback));
  },
  getTransaction: function (transactionHash, callback) {
    return this.getTransactionByHash(transactionHash, callback);
  },
  getTx: function (transactionHash, callback) {
    return this.getTransactionByHash(transactionHash, callback);
  },
  getTransactionCount: function (address, callback) {
    return store.dispatch(wrappers.eth.getTransactionCount([address, "latest"], callback));
  },
  // TODO remove
  txCount: function (address, callback) {
    return this.getTransactionCount(address, callback);
  },
  getPendingTransactionCount: function (address, callback) {
    return store.dispatch(wrappers.eth.getTransactionCount([address, "pending"], callback));
  },
  // TODO remove
  pendingTxCount: function (address, callback) {
    return this.getPendingTransactionCount(address, callback);
  },
  getTransactionReceipt: function (transactionHash, callback) {
    return store.dispatch(wrappers.eth.getTransactionReceipt(transactionHash, callback));
  },
  // TODO remove
  receipt: function (transactionHash, callback) {
    return this.getTransactionReceipt(transactionHash, callback);
  },
  getUncleByBlockHashAndIndex: function (blockHash, index, callback) {
    return store.dispatch(wrappers.eth.getUncleByBlockHashAndIndex([blockHash, index], callback));
  },
  getUncleByBlockNumberAndIndex: function (blockNumber, index, callback) {
    return store.dispatch(wrappers.eth.getUncleByBlockNumberAndIndex([validateAndDefaultBlockNumber(blockNumber), index], callback));
  },
  getUncle: function (blockNumber, index, callback) {
    return this.getUncleByBlockNumberAndIndex(blockNumber, index, callback);
  },
  getUncleCountByBlockHash: function (blockHash, callback) {
    return store.dispatch(wrappers.eth.getUncleCountByBlockHash([blockHash], callback));
  },
  getUncleCountByBlockNumber: function (blockNumber, callback) {
    return store.dispatch(wrappers.eth.getUncleCountByBlockNumber([validateAndDefaultBlockNumber(blockNumber)], callback));
  },
  getUncleCount: function (blockNumber, callback) {
    return this.getUncleCountByBlockNumber(blockNumber, callback);
  },
  hashrate: function (callback) { return store.dispatch(wrappers.eth.hashrate(null, callback)); },
  mining: function (callback) { return store.dispatch(wrappers.eth.mining(null, callback)); },
  newBlockFilter: function (callback) { return store.dispatch(wrappers.eth.newBlockFilter(null, callback)); },
  /**
   * @param {{fromBlock:number|string, toBlock:number|string, address:string, topics:string[], limit:number}} filterOptions
   */
  newFilter: function (filterOptions, callback) {
    filterOptions.fromBlock = validateAndDefaultBlockNumber(filterOptions.fromBlock);
    filterOptions.toBlock = validateAndDefaultBlockNumber(filterOptions.toBlock);
    return store.dispatch(wrappers.eth.newFilter(filterOptions, callback));
  },
  newPendingTransactionFilter: function (callback) { return store.dispatch(wrappers.eth.newPendingTransactionFilter(null, callback)); },
  protocolVersion: function (callback) { return store.dispatch(wrappers.eth.protocolVersion(null, callback)); },
  /**
   * @param {string} signedTransaction - RLP encoded transaction signed with private key
   */
  sendRawTransaction: function (signedTransaction, callback) {
    // allow for malformed input
    if (/^[0-9a-fA-F]*$/.test(signedTransaction)) {
      signedTransaction = "0x" + signedTransaction;
    }
    if (!/^0x[0-9a-fA-F]*$/.test(signedTransaction)) {
      throw new Error("signedTransaction must be RLP encoded hex byte array encoded into a string");
    }
    return store.dispatch(wrappers.eth.sendRawTransaction([signedTransaction], callback));
  },
  /**
   * @param {{from:string, to:string, gas:number, gasPrice:number, value:number, data:string, nonce:number}} transaction
   */
  sendTransaction: function (transaction, callback) {
    validateTransaction(transaction);
    return store.dispatch(wrappers.eth.sendTransaction([transaction], callback));
  },
  sign: function (address, data, callback) {
    return store.dispatch(wrappers.eth.sign([address, data], callback));
  },
  signTransaction: function (transaction, callback) {
    validateTransaction(transaction);
    return store.dispatch(wrappers.eth.signTransaction([transaction], callback));
  },
  subscribe: function (label, options, callback) {
    if (options === undefined) options = {};
    if (options === null) options = {};
    if (typeof options !== "object") throw new Error("options must be an object");
    return store.dispatch(wrappers.eth.subscribe([label, options], callback));
  },
  subscribeLogs: function (options, callback) {
    return this.subscribe("logs", options, callback);
  },
  subscribeNewHeads: function (callback) {
    return this.subscribe("newHeads", null, callback);
  },
  subscribeNewPendingTransactions: function (callback) {
    return this.subscribe("newPendingTransactions", null, callback);
  },
  syncing: function (callback) { return store.dispatch(wrappers.eth.syncing(null, callback)); },
  uninstallFilter: function (filter, callback) {
    return store.dispatch(wrappers.eth.uninstallFilter([filter], callback));
  },
  unsubscribe: function (label, callback) {
    return store.dispatch(wrappers.eth.unsubscribe([label], callback));
  },

  /************************
   * Convenience wrappers *
   ************************/

  sendEther: function (to, value, from, onSent, onSuccess, onFailed) {
    return store.dispatch(sendEther(to, value, from, onSent, onSuccess, onFailed));
  },
  publish: function (compiled, callback) {
    return store.dispatch(publish(compiled, callback));
  },
  ensureLatestBlock: function (callback) {
    return store.dispatch(ensureLatestBlock(callback));
  },
  unlocked: function (account, callback) {
    return store.dispatch(isUnlocked(account, callback));
  },
  fastforward: function (blocks, mine, callback) {
    return store.dispatch(waitForNextBlocks(blocks, mine, callback));
  },
  resend: function (transaction, gasPrice, gasLimit, callback) {
    return store.dispatch(resendTransaction(transaction, gasPrice, gasLimit, callback));
  },
  resendRawTransaction: function (transaction, privateKey, gasPrice, gasLimit, callback) {
    return store.dispatch(resendRawTransaction(transaction, privateKey, gasPrice, gasLimit, callback));
  },

  invoke: function (payload, callback) {
    return store.dispatch(callOrSendTransaction(payload, callback));
  },
  fire: function (payload, callback, wrapper, aux) {
    return store.dispatch(callContractFunction(payload, callback, wrapper, aux));
  },
  transact: function (payload, onSent, onSuccess, onFailed) {
    return store.dispatch(transact(payload, onSent, onSuccess, onFailed));
  }

};
