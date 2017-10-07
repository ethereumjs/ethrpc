"use strict";

var createStore = require("redux").createStore;
var thunkSubscribeEnhancer = require("redux-thunk-subscribe");

var ensureLatestBlock = require("./block-management/ensure-latest-block");
var waitForNextBlocks = require("./block-management/wait-for-next-blocks");
var packageAndSubmitRawTransaction = require("./raw-transactions/package-and-submit-raw-transaction");
var packageAndSignRawTransaction = require("./raw-transactions/package-and-sign-raw-transaction");
var packageRawTransaction = require("./raw-transactions/package-raw-transaction");
var signRawTransaction = require("./raw-transactions/sign-raw-transaction");
var signRawTransactionWithKey = require("./raw-transactions/sign-raw-transaction-with-key");
var packageRequest = require("./encode-request/package-request");
var handleRPCError = require("./decode-response/handle-rpc-error");
var validateAndDefaultBlockNumber = require("./validate/validate-and-default-block-number");
var validateTransaction = require("./validate/validate-transaction");
var registerTransactionRelay = require("./transaction-relay/register-transaction-relay");
var unregisterTransactionRelay = require("./transaction-relay/unregister-transaction-relay");
var excludeFromTransactionRelay = require("./transaction-relay/exclude-from-transaction-relay");
var includeInTransactionRelay = require("./transaction-relay/include-in-transaction-relay");
var callOrSendTransaction = require("./transact/call-or-send-transaction");
var callContractFunction = require("./transact/call-contract-function");
var transact = require("./transact/transact");

var raw = require("./wrappers/raw");
var eth = require("./wrappers/eth");
var net_ = require("./wrappers/net");
var web3 = require("./wrappers/web3");
var personal = require("./wrappers/personal");
var shh = require("./wrappers/shh");
var miner = require("./wrappers/miner");
var sendEther = require("./wrappers/send-ether");
var publish = require("./wrappers/publish");
var bindDispatch = require("./wrappers/bind-dispatch");
var isUnlocked = require("./wrappers/is-unlocked");
var resendTransaction = require("./wrappers/resend-transaction");
var resendRawTransaction = require("./wrappers/resend-raw-transaction");

var isFunction = require("./utils/is-function");
var sha3 = require("./utils/sha3");
var setDebugOptions = require("./debug/set-debug-options");
var errors = require("./errors/codes");
var clearTransactions = require("./clear-transactions");
var resetState = require("./reset-state");
var connect = require("./connect");
var internalState = require("./internal-state");
var constants = require("./constants");

var createEthrpc = function (reducer) {
  var store = createStore(reducer, thunkSubscribeEnhancer);
  var dispatch = store.dispatch;
  return {
    errors: errors,
    constants: constants,

    setDebugOptions: function (debugOptions) { return dispatch(setDebugOptions(debugOptions)); },

    connect: function (configuration, callback) { return dispatch(connect(configuration, callback)); },
    clear: function () { return dispatch(clearTransactions()); },
    resetState: function () { return dispatch(resetState()); },

    // Redux store state-lookup wrappers
    getBlockStream: function () { return internalState.get("blockAndLogStreamer"); },
    getConfiguration: function () { return store.getState().configuration; },
    getCoinbase: function () { return store.getState().coinbase; },
    getCurrentBlock: function () { return store.getState().currentBlock; },
    getDebugOptions: function () { return store.getState().debug; },
    getGasPrice: function () { return store.getState().gasPrice; },
    getHighestNonce: function () { return store.getState().highestNonce; },
    getNetworkID: function () { return store.getState().networkID; },
    getNoRelay: function () { return store.getState().noRelay; },
    getSubscriptions: function () { return store.getState().subscriptions; },
    getTransactions: function () { return store.getState().transactions; },

    registerTransactionRelay: function (relayer) { return dispatch(registerTransactionRelay(relayer)); },
    unregisterTransactionRelay: function (relayer) { return dispatch(unregisterTransactionRelay(relayer)); },
    excludeFromTransactionRelay: function (method) { return dispatch(excludeFromTransactionRelay(method)); },
    includeInTransactionRelay: function (method) { return dispatch(includeInTransactionRelay(method)); },

    /******************************
     * Ethereum JSON-RPC bindings *
     ******************************/

    raw: function (cmd, params, callback) { return dispatch(raw(cmd, params, callback)); },

    eth: bindDispatch(dispatch, eth),
    net: bindDispatch(dispatch, net_),
    web3: bindDispatch(dispatch, web3),
    shh: bindDispatch(dispatch, shh),
    miner: bindDispatch(dispatch, miner),
    personal: bindDispatch(dispatch, personal),

    // web3_
    sha3: sha3,
    clientVersion: function (callback) { return dispatch(web3.clientVersion(null, callback)); },

    // net_
    listening: function (callback) { return dispatch(net_.listening(null, callback)); },
    peerCount: function (callback) { return dispatch(net_.peerCount(null, callback)); },
    version: function (callback) { return dispatch(net_.version(null, callback)); },
    netVersion: function (callback) { return this.version(callback); },

    // eth_
    accounts: function (callback) { return dispatch(eth.accounts(null, callback)); },
    blockNumber: function (callback) { return dispatch(eth.blockNumber(null, callback)); },
    call: function (transaction, blockNumber, callback) {
      if (isFunction(blockNumber)) {
        callback = blockNumber;
        blockNumber = null;
      }
      return dispatch(eth.call([transaction, validateAndDefaultBlockNumber(blockNumber)], callback));
    },
    coinbase: function (callback) { return dispatch(eth.coinbase(null, callback)); },
    // note: compileLLL, compileSerpent, and compileSolidity intentionally left out
    estimateGas: function (transaction, blockNumber, callback) {
      if (isFunction(blockNumber)) {
        callback = blockNumber;
        blockNumber = null;
      }
      return dispatch(eth.estimateGas([transaction, validateAndDefaultBlockNumber(blockNumber)], callback));
    },
    gasPrice: function (callback) { return dispatch(eth.gasPrice(null, callback)); },
    getBalance: function (address, blockNumber, callback) {
      if (isFunction(blockNumber)) {
        callback = blockNumber;
        blockNumber = null;
      }
      return dispatch(eth.getBalance([address, validateAndDefaultBlockNumber(blockNumber)], callback));
    },
    balance: function (address, blockNumber, callback) {
      return this.getBalance(address, blockNumber, callback);
    },
    getBlockByHash: function (hash, shouldReturnFullTransactions, callback) {
      if (shouldReturnFullTransactions === undefined) shouldReturnFullTransactions = true;
      return dispatch(eth.getBlockByHash([hash, Boolean(shouldReturnFullTransactions)], callback));
    },
    getBlockByNumber: function (number, shouldReturnFullTransactions, callback) {
      if (shouldReturnFullTransactions !== true) shouldReturnFullTransactions = false;
      return dispatch(eth.getBlockByNumber([validateAndDefaultBlockNumber(number), Boolean(shouldReturnFullTransactions)], callback));
    },
    getBlock: function (number, shouldReturnFullTransactions, callback) { return this.getBlockByNumber(number, shouldReturnFullTransactions, callback); },
    getCode: function (address, blockNumber, callback) { return dispatch(eth.getCode([address, validateAndDefaultBlockNumber(blockNumber)], callback)); },
    getFilterChanges: function (filter, callback) { return dispatch(eth.getFilterChanges([filter], callback)); },
    getFilterLogs: function (filter, callback) { return dispatch(eth.getFilterLogs(filter, callback)); },
    getLogs: function (filter, callback) { return dispatch(eth.getLogs(filter, callback)); },
    // TODO: add map lookup support (at the moment, this function doesn't support
    // map lookups due to rounding errors after 51-bits for JS numbers)
    getStorageAt: function (address, position, blockNumber, callback) { return dispatch(eth.getStorageAt([address, position, validateAndDefaultBlockNumber(blockNumber)], callback)); },
    getTransactionByHash: function (transactionHash, callback) { return dispatch(eth.getTransactionByHash([transactionHash], callback)); },
    getTransaction: function (transactionHash, callback) { return this.getTransactionByHash(transactionHash, callback); },
    getTransactionCount: function (address, callback) { return dispatch(eth.getTransactionCount([address, "latest"], callback)); },
    getPendingTransactionCount: function (address, callback) { return dispatch(eth.getTransactionCount([address, "pending"], callback)); },
    getTransactionReceipt: function (transactionHash, callback) { return dispatch(eth.getTransactionReceipt(transactionHash, callback)); },
    getUncleByBlockHashAndIndex: function (blockHash, index, callback) { return dispatch(eth.getUncleByBlockHashAndIndex([blockHash, index], callback)); },
    getUncleByBlockNumberAndIndex: function (blockNumber, index, callback) { return dispatch(eth.getUncleByBlockNumberAndIndex([validateAndDefaultBlockNumber(blockNumber), index], callback)); },
    getUncle: function (blockNumber, index, callback) { return this.getUncleByBlockNumberAndIndex(blockNumber, index, callback); },
    getUncleCountByBlockHash: function (blockHash, callback) { return dispatch(eth.getUncleCountByBlockHash([blockHash], callback)); },
    getUncleCountByBlockNumber: function (blockNumber, callback) { return dispatch(eth.getUncleCountByBlockNumber([validateAndDefaultBlockNumber(blockNumber)], callback)); },
    getUncleCount: function (blockNumber, callback) { return this.getUncleCountByBlockNumber(blockNumber, callback); },
    hashrate: function (callback) { return dispatch(eth.hashrate(null, callback)); },
    mining: function (callback) { return dispatch(eth.mining(null, callback)); },
    newBlockFilter: function (callback) { return dispatch(eth.newBlockFilter(null, callback)); },
    /**
     * @param {{fromBlock:number|string, toBlock:number|string, address:string, topics:string[], limit:number}} filterOptions
     */
    newFilter: function (filterOptions, callback) {
      filterOptions.fromBlock = validateAndDefaultBlockNumber(filterOptions.fromBlock);
      filterOptions.toBlock = validateAndDefaultBlockNumber(filterOptions.toBlock);
      return dispatch(eth.newFilter(filterOptions, callback));
    },
    newPendingTransactionFilter: function (callback) { return dispatch(eth.newPendingTransactionFilter(null, callback)); },
    protocolVersion: function (callback) { return dispatch(eth.protocolVersion(null, callback)); },
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
      return dispatch(eth.sendRawTransaction([signedTransaction], callback));
    },
    /**
     * @param {{from:string, to:string, gas:number, gasPrice:number, value:number, data:string, nonce:number}} transaction
     */
    sendTransaction: function (transaction, callback) {
      validateTransaction(transaction);
      return dispatch(eth.sendTransaction([transaction], callback));
    },
    sign: function (address, data, callback) { return dispatch(eth.sign([address, data], callback)); },
    signTransaction: function (transaction, callback) {
      validateTransaction(transaction);
      return dispatch(eth.signTransaction([transaction], callback));
    },
    subscribe: function (label, options, callback) {
      if (options === undefined) options = {};
      if (options === null) options = {};
      if (typeof options !== "object") throw new Error("options must be an object");
      return dispatch(eth.subscribe([label, options], callback));
    },
    subscribeLogs: function (options, callback) { return this.subscribe("logs", options, callback); },
    subscribeNewHeads: function (callback) { return this.subscribe("newHeads", null, callback); },
    subscribeNewPendingTransactions: function (callback) { return this.subscribe("newPendingTransactions", null, callback); },
    syncing: function (callback) { return dispatch(eth.syncing(null, callback)); },
    uninstallFilter: function (filter, callback) { return dispatch(eth.uninstallFilter([filter], callback)); },
    unsubscribe: function (label, callback) { return dispatch(eth.unsubscribe([label], callback)); },

    /************************
     * Convenience wrappers *
     ************************/

    signRawTransaction: signRawTransaction,
    signRawTransactionWithKey: signRawTransactionWithKey,
    packageRawTransaction: packageRawTransaction,
    packageRequest: packageRequest,
    packageAndSubmitRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
      return dispatch(packageAndSubmitRawTransaction(payload, address, privateKeyOrSigner, accountType, callback));
    },
    packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
      return dispatch(packageAndSignRawTransaction(payload, address, privateKeyOrSigner, accountType, callback));
    },

    handleRPCError: handleRPCError,
    sendEther: function (to, value, from, onSent, onSuccess, onFailed) { return dispatch(sendEther(to, value, from, onSent, onSuccess, onFailed)); },
    publish: function (compiled, callback) { return dispatch(publish(compiled, callback)); },
    ensureLatestBlock: function (callback) { return dispatch(ensureLatestBlock(callback)); },
    isUnlocked: function (account, callback) { return dispatch(isUnlocked(account, callback)); },
    waitForNextBlocks: function (blocks, mine, callback) { return dispatch(waitForNextBlocks(blocks, mine, callback)); },
    resend: function (transaction, gasPrice, gasLimit, callback) { return dispatch(resendTransaction(transaction, gasPrice, gasLimit, callback)); },
    resendRawTransaction: function (transaction, privateKey, gasPrice, gasLimit, callback) { return dispatch(resendRawTransaction(transaction, privateKey, gasPrice, gasLimit, callback)); },

    callOrSendTransaction: function (payload, callback) { return dispatch(callOrSendTransaction(payload, callback)); },
    callContractFunction: function (payload, callback, wrapper, aux) { return dispatch(callContractFunction(payload, callback, wrapper, aux)); },
    transact: function (payload, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed) { return dispatch(transact(payload, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed)); }
  };
};

module.exports = createEthrpc;
