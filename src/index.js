/**
 * JSON RPC methods for Ethereum
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var clone = require("clone");
var BigNumber = require("bignumber.js");
var keccak_256 = require("js-sha3").keccak_256;
var abi = require("augur-abi");

var BlockAndLogStreamer = require("ethereumjs-blockstream").BlockAndLogStreamer;
var BlockNotifier = require("./block-management/block-notifier");
var createTransportAdapter = require("./block-management/ethrpc-transport-adapter");
var Transporter = require("./transport/transporter");

var packageAndSubmitRawTransaction = require("./raw-transactions/package-and-submit-raw-transaction");
var packageAndSignRawTransaction = require("./raw-transactions/package-and-sign-raw-transaction");
var packageRawTransaction = require("./raw-transactions/package-raw-transaction");
var signRawTransaction = require("./raw-transactions/sign-raw-transaction");

var packageRequest = require("./encode-request/package-request");
var makeRequestPayload = require("./encode-request/make-request-payload");
var stripReturnsTypeAndInvocation = require("./encode-request/strip-returns-type-and-invocation");

var handleRPCError = require("./decode-response/handle-rpc-error");
var parseEthereumResponse = require("./decode-response/parse-ethereum-response");
var convertResponseToReturnsType = require("./decode-response/convert-response-to-returns-type");

var validateAndDefaultBlockNumber = require("./validate/validate-and-default-block-number");
var validateTransaction = require("./validate/validate-transaction");

var isFunction = require("./utils/is-function");
var wait = require("./utils/wait");
var noop = require("./utils/noop");

var ErrorWithData = require("./errors").ErrorWithData;
var ErrorWithCodeAndData = require("./errors").ErrorWithCodeAndData;
var RPCError = require("./errors/rpc-error");
var errors = require("./errors/codes");

var constants = require("./constants");

BigNumber.config({
  MODULO_MODE: BigNumber.EUCLID,
  ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN
});

module.exports = {

  debug: {
    connect: false,
    tx: false,
    broadcast: false,
    nonce: false,
    sync: false
  },

  errors: errors,

  gasPrice: 20000000000,

  // Hook for transaction callbacks
  txRelay: null,

  // Do not call txRelay for these methods
  excludedFromTxRelay: null,

  txs: null,
  rawTxMaxNonce: null,
  block: null,
  networkID: null,

  notifications: null,

  configuration: null,
  internalState: null,

  packageAndSubmitRawTransaction: packageAndSubmitRawTransaction,
  packageAndSignRawTransaction: packageAndSignRawTransaction,
  signRawTransaction: signRawTransaction,
  packageRawTransaction: packageRawTransaction,
  packageRequest: packageRequest,

  /**
   * Initiates a connection to Ethereum.  This must be called before any other methods are called.
   *
   * @typedef configuration
   * @type {object}
   * @property {?string[]} httpAddresses
   * @property {?string[]} wsAddresses
   * @property {?string[]} ipcAddresses
   * @property {?number} connectionTimeout
   * @property {?number} pollingIntervalMilliseconds
   * @property {?number} blockRetention
   * @property {!function(Error):void} errorHandler - called when an otherwise unhandled asynchronous error occurs during the course of operation.
   *
   * @param {!configuration} configuration
   * @param {!function(?Error):void} initialConnectCallback - if the error parameter is null then the connection was successful
   * @returns {void}
   */
  connect: function (configuration, initialConnectCallback) {
    var key, syncOnly;
    this.resetState();

    // overwrite configuration values with user config, throw away unused user config
    for (key in this.configuration) {
      if (this.configuration.hasOwnProperty(key)) {
        if (configuration[key] !== undefined && configuration[key] !== null) {
          this.configuration[key] = configuration[key];
        }
      }
    }

    // use default (console.error) error handler if not set
    if (!isFunction(this.configuration.errorHandler)) {
      this.configuration.errorHandler = function (err) { console.error(err); };
    }

    // validate configuration
    if (!Array.isArray(this.configuration.httpAddresses)) {
      return this.configuration.errorHandler(new Error("configuration.httpAddresses must be an array."));
    }
    if (this.configuration.httpAddresses.some(function (x) { return typeof x !== "string"; })) {
      return this.configuration.errorHandler(new Error("configuration.httpAddresses must contain only strings."));
    }
    if (!Array.isArray(this.configuration.wsAddresses)) {
      return this.configuration.errorHandler(new Error("configuration.wsAddresses must be an array."));
    }
    if (this.configuration.wsAddresses.some(function (x) { return typeof x !== "string"; })) {
      return this.configuration.errorHandler(new Error("configuration.wsAddresses must contain only strings."));
    }
    if (!Array.isArray(this.configuration.ipcAddresses)) {
      return this.configuration.errorHandler(new Error("configuration.ipcAddresses must be an array."));
    }
    if (this.configuration.ipcAddresses.some(function (x) { return typeof x !== "string"; })) {
      return this.configuration.errorHandler(new Error("configuration.ipcAddresses must contain only strings."));
    }

    syncOnly = !initialConnectCallback;
    if (syncOnly) {
      initialConnectCallback = function (error) {
        if (error instanceof Error) {
          throw error;
        } else if (error) {
          throw new ErrorWithData(error);
        }
      };
    }

    // initialize the transporter, this will be how we send to and receive from the blockchain
    new Transporter(this.configuration, this.internalState.shimMessageHandler, syncOnly, this.debug.connect, function (error, transporter) {
      if (error !== null) return initialConnectCallback(error);
      this.internalState.transporter = transporter;
      // ensure we can do basic JSON-RPC over this connection
      this.version(function (errorOrResult) {
        if (errorOrResult instanceof Error || errorOrResult.error) {
          return initialConnectCallback(errorOrResult);
        }
        this.createBlockAndLogStreamer({
          pollingIntervalMilliseconds: this.configuration.pollingIntervalMilliseconds,
          blockRetention: this.configuration.blockRetention
        }, createTransportAdapter(this));
        this.internalState.blockAndLogStreamer.subscribeToOnBlockAdded(this.onNewBlock.bind(this));
        initialConnectCallback(null);
      }.bind(this));
    }.bind(this));
  },

  /**
   * Resets the global state of this module to default.
   */
  resetState: function () {
    var oldMessageHandlerObject, newMessageHandlerObject;

    // stop any pending timers
    clearInterval((this.internalState || {}).newBlockIntervalTimeoutId);

    // reset configuration to defaults
    this.configuration = {
      httpAddresses: [],
      wsAddresses: [],
      ipcAddresses: [],
      connectionTimeout: 3000,
      pollingIntervalMilliseconds: 30000,
      blockRetention: 100,
      errorHandler: null
    };

    // destroy the old BlockNotifier so it doesn't try to reconnect or continue polling
    (((this.internalState || {}).blockNotifier || {}).destroy || function () {})();

    // redirect any not-yet-received responses to /dev/null
    oldMessageHandlerObject = (this.internalState || {}).shimMessageHandlerObject || {};
    newMessageHandlerObject = { realMessageHandler: this.blockchainMessageHandler.bind(this) };
    oldMessageHandlerObject.realMessageHandler = function () {};

    // reset state to defaults
    this.internalState = {
      transporter: null,
      blockNotifier: null,
      blockAndLogStreamer: null,
      outstandingRequests: {},
      subscriptions: {},
      newBlockIntervalTimeoutId: null,
      shimMessageHandlerObject: newMessageHandlerObject,
      // by binding this function to `shimMessageHandlerObject`, its `this`
      // value will be a pointer to an object that we can mutate before
      // replacing when reset
      shimMessageHandler: function (error, jso) {
        this.realMessageHandler(error, jso);
      }.bind(newMessageHandlerObject)
    };

    // reset public state
    this.block = null;
    this.excludedFromTxRelay = {};
    this.gasPrice = 20000000000;
    this.notifications = {};
    this.rawTxMaxNonce = -1;
    this.txs = {};
  },

  /**
   * Used internally.  Submits a remote procedure call to the blockchain.
   *
   * @param {!object} jso - The JSON-RPC call to make.
   * @param {?string} transportRequirements - ANY, SYNC or DUPLEX.  Will choose best available transport that meets the requirements.
   * @param {?function(?Error, ?object):void} callback - Called when a response to the request is received.  May only be null if preferredTransport is SYNC.
   * @returns {void|?Error|?object} - Returns the error or result if the operation is synchronous.
   */
  submitRequestToBlockchain: function (jso, transportRequirements, callback) {
    var syncErrorOrResult, expectedReturnTypes;
    if (transportRequirements === "SYNC") {
      callback = function (error, result) { return (syncErrorOrResult = (error || result)); };
    }

    if (isFunction(transportRequirements) && !callback) {
      callback = transportRequirements;
      transportRequirements = null;
    }

    if (!isFunction(callback)) throw new Error("callback must be a function");
    if (typeof transportRequirements !== "string" && transportRequirements !== null) {
      return callback(new Error("transportRequirements must be null or a string"));
    }
    if (typeof jso !== "object") return callback(new Error("jso must be an object"));
    if (typeof jso.id !== "number") return callback(new Error("jso.id must be a number"));

    // FIXME: return types shouldn't be embedded into the RPC JSO
    expectedReturnTypes = stripReturnsTypeAndInvocation(jso);
    this.internalState.outstandingRequests[jso.id] = {
      jso: jso,
      expectedReturnTypes: expectedReturnTypes,
      callback: callback
    };

    this.internalState.transporter.blockchainRpc(jso, transportRequirements, this.debug.broadcast);

    if (transportRequirements === "SYNC") {
      if (typeof this.internalState.outstandingRequests[jso.id] !== "undefined") {
        return new Error("SYNC request didn't receive messageHandler call before returning.");
      }
      return syncErrorOrResult;
    }
  },

  /**
   * Used internally.  Processes a response from the blockchain by looking up the associated callback and calling it.
   */
  blockchainMessageHandler: function (error, jso) {
    var subscriptionHandler, responseHandler, errorHandler;

    if (error !== null) {
      return this.configuration.errorHandler(error);
    }
    if (typeof jso !== "object") {
      return this.configuration.errorHandler(new ErrorWithData("Unexpectedly received a message from the transport that was not an object.", jso));
    }

    subscriptionHandler = function () {
      var subscriptionCallback;
      if (jso.method !== "eth_subscription") {
        return this.configuration.errorHandler(new ErrorWithData("Received an RPC request that wasn't an `eth_subscription`.", jso));
      }
      if (typeof jso.params.subscription !== "string") {
        return this.configuration.errorHandler(new ErrorWithData("Received an `eth_subscription` request without a subscription ID.", jso));
      }
      if (jso.params.result === null || jso.params.result === undefined) {
        return this.configuration.errorHandler(new ErrorWithData("Received an `eth_subscription` request without a result.", jso));
      }

      subscriptionCallback = this.internalState.subscriptions[jso.params.subscription];
      if (subscriptionCallback) subscriptionCallback(jso.params.result);
    }.bind(this);

    responseHandler = function () {
      var outstandingRequest;
      if (typeof jso.id !== "number") {
        return this.configuration.errorHandler(new ErrorWithData("Received a message from the blockchain that didn't have a valid id.", jso));
      }
      outstandingRequest = this.internalState.outstandingRequests[jso.id];
      delete this.internalState.outstandingRequests[jso.id];
      if (typeof outstandingRequest !== "object") {
        return this.configuration.errorHandler(new ErrorWithData("Unable to locate original request for blockchain response.", jso));
      }

      // FIXME: outstandingRequest.callback should be function(Error,object) not function(Error|object)
      parseEthereumResponse(jso, outstandingRequest.expectedReturnTypes, outstandingRequest.callback);
    }.bind(this);

    errorHandler = function () {
      // errors with IDs can go through the normal result process
      if (jso.id !== null && jso.id !== undefined) {
        return responseHandler.bind(this)(jso);
      }
      this.configuration.errorHandler(new ErrorWithCodeAndData(jso.error.message, jso.error.code, jso.error.data));
    }.bind(this);

    // depending on the type of message it is (request, response, error, invalid) we will handle it differently
    if (jso.method !== undefined) {
      subscriptionHandler();
    } else if (jso.result !== undefined) {
      responseHandler();
    } else if (jso.error !== undefined) {
      errorHandler();
    } else {
      this.configuration.errorHandler(new ErrorWithData("Received an invalid JSON-RPC message.", jso));
    }
  },

  /**
   * Used internally.  Instantiates a new BlockAndLogStreamer backed by ethrpc and BlockNotifier.
   *
   * @typedef Block
   * @type object
   * @property hash
   * @property parentHash
   *
   * @typedef FilterOptions
   * @type object
   * @property {(string|undefined)} address
   * @property {(string|string[]|null)[]} topics
   * @property {(string|undefined)} fromBlock
   * @property {(string|undefined)} toBlock
   * @property {(string|undefined)} limit
   *
   * @typedef Configuration
   * @type object
   * @property {number} pollingIntervalMilliseconds
   * @property {number} blockRetention
   *
   * @typedef Transport
   * @type object
   * @property {function(function(Error, Block):void):void} getLatestBlock
   * @property {function(string, function(Error, Block):void):void} getBlockByHash
   * @property {function(FilterOptions, function(Error, Log[]):void):void} getLogs
   * @property {function(function():void, function(Error):void):string} subscribeToReconnects
   * @property {function(string):void} unsubscribeFromReconnects
   * @property {function(function(Block):void, function(Error):void):string} subscribeToNewHeads
   * @property {function(string):void} unsubscribeFromNewHeads
   *
   * @param {Configuration} configuration
   * @param {Transport} transport
   */
  createBlockAndLogStreamer: function (configuration, transport) {
    var reconcileWithErrorLogging;
    this.internalState.blockNotifier = new BlockNotifier(transport, configuration.pollingIntervalMilliseconds);
    this.internalState.blockAndLogStreamer = BlockAndLogStreamer.createCallbackStyle(transport.getBlockByHash, transport.getLogs, { blockRetention: configuration.blockRetention });
    reconcileWithErrorLogging = function (block) {
      this.internalState.blockAndLogStreamer.reconcileNewBlockCallbackStyle(block, function (error) {
        if (error) console.error(error);
      });
    }.bind(this);
    this.internalState.blockNotifier.subscribe(reconcileWithErrorLogging);
  },

  /**
   * Provides access to the internally managed BlockAndLogStreamer instance.
   */
  getBlockAndLogStreamer: function () {
    return this.internalState.blockAndLogStreamer;
  },

  onNewBlock: function (block) {
    var transactionHash;
    if (typeof block !== "object") throw new Error("block must be an object");

    // for legacy compatability, use getBlockAndLogStream().getLatestReconciledBlock()
    this.block = clone(block);
    this.block.number = parseInt(block.number, 16);

    // re-process all transactions
    for (transactionHash in this.txs) {
      if (this.txs.hasOwnProperty(transactionHash)) {
        this.updateTx(this.txs[transactionHash]);
      }
    }
  },

  /**
   * Transaction relay setup
   */

  registerTxRelay: function (txRelay) {
    this.txRelay = txRelay;
  },

  unregisterTxRelay: function () {
    this.txRelay = null;
  },

  wrapTxRelayCallback: function (status, payload, callback) {
    var self = this;
    return function (response) {
      if (isFunction(callback)) callback(response);
      if (payload.method && !self.excludedFromTxRelay[payload.method]) {
        self.txRelay({
          type: payload.label || payload.method,
          status: status,
          data: payload,
          response: response
        });
      }
    };
  },

  excludeFromTxRelay: function (method) {
    var i, numMethods;
    if (method) {
      if (method.constructor === Array && method.length) {
        for (i = 0, numMethods = method.length; i < numMethods; ++i) {
          this.excludedFromTxRelay[method[i]] = true;
        }
      } else {
        this.excludedFromTxRelay[method] = true;
      }
    }
  },

  includeInTxRelay: function (method) {
    var i, numMethods;
    if (method) {
      if (method.constructor === Array && method.length) {
        for (i = 0, numMethods = method.length; i < numMethods; ++i) {
          this.excludedFromTxRelay[method[i]] = false;
        }
      } else {
        this.excludedFromTxRelay[method] = false;
      }
    }
  },

  // delete cached network, notification, and transaction data
  clear: function () {
    var n;
    for (n in this.notifications) {
      if (this.notifications.hasOwnProperty(n)) {
        if (this.notifications[n]) {
          clearTimeout(this.notifications[n]);
        }
      }
    }
    this.txs = {};
    this.rawTxMaxNonce = -1;
  },

  /******************************
   * Ethereum JSON-RPC bindings *
   ******************************/

  raw: function (command, params, callback) {
    var transportRequirements = "ANY";
    if (!callback) transportRequirements = "SYNC";
    return this.submitRequestToBlockchain(makeRequestPayload(command, params, null), transportRequirements, callback);
  },

  eth: function (command, params, callback) {
    return this.raw("eth_" + command, params, callback);
  },

  net: function (command, params, callback) {
    return this.raw("net_" + command, params, callback);
  },

  web3: function (command, params, callback) {
    return this.raw("web3_" + command, params, callback);
  },

  shh: function (command, params, callback) {
    return this.raw("shh_" + command, params, callback);
  },

  miner: function (command, params, callback) {
    return this.raw("miner_" + command, params, callback);
  },

  admin: function (command, params, callback) {
    return this.raw("admin_" + command, params, callback);
  },

  personal: function (command, params, callback) {
    return this.raw("personal_" + command, params, callback);
  },

  txpool: function (command, params, callback) {
    return this.raw("txpool_" + command, params, callback);
  },

  // ****
  // web3_*
  // ****

  clientVersion: function (callback) {
    return this.web3("clientVersion", null, callback);
  },

  // TODO: make this take a callback like everything else
  sha3: function (data, isHex) {
    if (isHex) data = abi.decode_hex(data);
    return abi.prefix_hex(keccak_256(data));
  },

  // ****
  // net_*
  // ****

  listening: function (callback) {
    return this.net("listening", null, callback);
  },

  peerCount: function (callback) {
    return this.net("peerCount", null, callback);
  },

  version: function (callback) {
    return this.net("version", null, callback);
  },

  netVersion: function (callback) {
    return this.version(callback);
  },

  // ****
  // eth_*
  // ****

  accounts: function (callback) {
    return this.eth("accounts", null, callback);
  },

  blockNumber: function (callback) {
    return this.eth("blockNumber", null, callback);
  },

  call: function (transaction, blockNumber, callback) {
    // support incorrect usage rather than failing fast
    if (isFunction(blockNumber)) {
      callback = blockNumber;
      blockNumber = null;
    }
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return this.eth("call", [transaction, blockNumber], callback);
  },

  coinbase: function (callback) {
    return this.eth("coinbase", null, callback);
  },

  // compileLLL intentionally left out, does not make sense as an RPC call

  // compileSerpent intentionally left out, does not make sense as an RPC call

  // compileSolidity intentionally left out, does not make sense as an RPC call

  estimateGas: function (transaction, blockNumber, callback) {
    // support incorrect usage rather than failing fast
    if (isFunction(blockNumber)) {
      callback = blockNumber;
      blockNumber = null;
    }
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return this.eth("estimateGas", [transaction, blockNumber], callback);
  },

  getGasPrice: function (callback) {
    return this.eth("gasPrice", null, callback);
  },

  getBalance: function (address, blockNumber, callback) {
    // support incorrect usage rather than failing fast
    if (isFunction(blockNumber)) {
      callback = blockNumber;
      blockNumber = null;
    }
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return this.eth("getBalance", [address, blockNumber], callback);
  },

  balance: function (address, blockNumber, callback) {
    return this.getBalance(address, blockNumber, callback);
  },

  getBlockByHash: function (hash, shouldReturnFullTransactions, callback) {
    if (shouldReturnFullTransactions === undefined) shouldReturnFullTransactions = true;
    return this.eth("getBlockByHash", [hash, Boolean(shouldReturnFullTransactions)], callback);
  },

  getBlockByNumber: function (number, shouldReturnFullTransactions, callback) {
    var block;
    if (shouldReturnFullTransactions !== true) shouldReturnFullTransactions = false;
    block = validateAndDefaultBlockNumber(number);
    return this.eth("getBlockByNumber", [block, Boolean(shouldReturnFullTransactions)], callback);
  },

  getBlock: function (number, shouldReturnFullTransactions, callback) {
    return this.getBlockByNumber(number, shouldReturnFullTransactions, callback);
  },

  // TODO: getBlockTransactionCountByHash

  // TODO: getBlockTransactionCountByNumber

  getCode: function (address, blockNumber, callback) {
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return this.eth("getCode", [address, blockNumber], callback);
  },

  read: function (address, blockNumber, callback) {
    return this.getCode(address, blockNumber, callback);
  },

  // TODO: getCompilers

  getFilterChanges: function (filter, callback) {
    return this.eth("getFilterChanges", [filter], callback);
  },

  getFilterLogs: function (filter, callback) {
    return this.eth("getFilterLogs", filter, callback);
  },

  getLogs: function (filter, callback) {
    return this.eth("getLogs", filter, callback);
  },

  // TODO: add map lookup support (at the moment, this function doesn't support map lookups due to rounding errors after 51-bits for JS numbers)
  getStorageAt: function (address, position, blockNumber, callback) {
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return this.eth("getStorageAt", [address, position, blockNumber], callback);
  },

  // TODO: getTransactionByBlockHashAndIndex

  // TODO: getTransactionByBlockNumberAndIndex

  getTransactionByHash: function (transactionHash, callback) {
    return this.eth("getTransactionByHash", [transactionHash], callback);
  },

  getTransaction: function (transactionHash, callback) {
    return this.getTransactionByHash(transactionHash, callback);
  },

  getTx: function (transactionHash, callback) {
    return this.getTransactionByHash(transactionHash, callback);
  },

  getTransactionCount: function (address, callback) {
    return this.eth("getTransactionCount", [address, "latest"], callback);
  },

  txCount: function (address, callback) {
    return this.getTransactionCount(address, callback);
  },

  getPendingTransactionCount: function (address, callback) {
    return this.eth("getTransactionCount", [address, "pending"], callback);
  },

  pendingTxCount: function (address, callback) {
    return this.getPendingTransactionCount(address, callback);
  },

  getTransactionReceipt: function (transactionHash, callback) {
    return this.eth("getTransactionReceipt", transactionHash, callback);
  },

  receipt: function (transactionHash, callback) {
    return this.getTransactionReceipt(transactionHash, callback);
  },

  getUncleByBlockHashAndIndex: function (blockHash, index, callback) {
    return this.eth("getUncleByBlockHashAndIndex", [blockHash, index], callback);
  },

  getUncleByBlockNumberAndIndex: function (blockNumber, index, callback) {
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return this.eth("getUncleByBlockNumberAndIndex", [blockNumber, index], callback);
  },

  getUncle: function (blockNumber, index, callback) {
    return this.getUncleByBlockNumberAndIndex(blockNumber, index, callback);
  },

  getUncleCountByBlockHash: function (blockHash, callback) {
    return this.eth("getUncleCountByBlockHash", [blockHash], callback);
  },

  getUncleCountByBlockNumber: function (blockNumber, callback) {
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return this.eth("getUncleCountByBlockNumber", [blockNumber], callback);
  },

  getUncleCount: function (blockNumber, callback) {
    return this.getUncleCountByBlockNumber(blockNumber, callback);
  },

  // TODO: getWork

  hashrate: function (callback) {
    return this.eth("hashrate", null, callback);
  },

  mining: function (callback) {
    return this.eth("mining", null, callback);
  },

  newBlockFilter: function (callback) {
    return this.eth("newBlockFilter", null, callback);
  },

  /**
   * @param {{fromBlock:number|string, toBlock:number|string, address:string, topics:string[], limit:number}} filterOptions
   */
  newFilter: function (filterOptions, callback) {
    filterOptions.fromBlock = validateAndDefaultBlockNumber(filterOptions.fromBlock);
    filterOptions.toBlock = validateAndDefaultBlockNumber(filterOptions.toBlock);
    return this.eth("newFilter", filterOptions, callback);
  },

  newPendingTransactionFilter: function (callback) {
    return this.eth("newPendingTransactionFilter", null, callback);
  },

  protocolVersion: function (callback) {
    return this.eth("protocolVersion", null, callback);
  },

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
    return this.eth("sendRawTransaction", [signedTransaction], callback);
  },

  /**
   * @param {{from:string, to:string, gas:number, gasPrice:number, value:number, data:string, nonce:number}} transaction
   */
  sendTransaction: function (transaction, callback) {
    validateTransaction(transaction);
    return this.eth("sendTransaction", [transaction], callback);
  },

  sendTx: function (transaction, callback) {
    return this.sendTransaction(transaction, callback);
  },

  sign: function (address, data, callback) {
    return this.eth("sign", [address, data], callback);
  },

  signTransaction: function (transaction, callback) {
    validateTransaction(transaction);
    return this.eth("signTransaction", [transaction], callback);
  },

  // TODO: submitHashrate

  // TODO: submitWork

  subscribe: function (label, options, callback) {
    if (options === undefined) options = {};
    if (options === null) options = {};
    if (typeof options !== "object") throw new Error("options must be an object");
    return this.eth("subscribe", [label, options], callback);
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

  syncing: function (callback) {
    return this.eth("syncing", null, callback);
  },

  uninstallFilter: function (filter, callback) {
    return this.eth("uninstallFilter", [filter], callback);
  },

  unsubscribe: function (label, callback) {
    return this.eth("unsubscribe", [label], callback);
  },

  // ****
  // personal_* (?parity only?)
  // ****

  // ****
  // signer_* (?parity only?)
  // ****

  // ****
  // shh_* (?geth only?)
  // ****

  // ****
  // trace_* (?parity only?)
  // ****

  /************************
   * Convenience wrappers *
   ************************/

  sendEther: function (to, value, from, onSent, onSuccess, onFailed) {
    if (to && to.constructor === Object) {
      value = to.value;
      from = to.from;
      if (to.onSent) onSent = to.onSent;
      if (to.onSuccess) onSuccess = to.onSuccess;
      if (to.onFailed) onFailed = to.onFailed;
      to = to.to;
    }
    return this.transact({
      from: from,
      to: to,
      value: abi.fix(value, "hex"),
      returns: "null",
      gas: "0xcf08"
    }, onSent, onSuccess, onFailed);
  },

  // publish a new contract to the blockchain (from the coinbase account)
  publish: function (compiled, f) {
    var self = this;
    if (!isFunction(f)) {
      return this.sendTx({ from: this.coinbase(), data: compiled });
    }
    this.coinbase(function (coinbase) {
      self.sendTx({ from: coinbase, data: compiled }, f);
    });
  },

  // ****
  // high level access
  // ****

  /**
   * Ensures that `this.block` contains the latest block.
   */
  ensureLatestBlock: function (callback) {
    var sync, resultOrError;
    sync = (!callback);
    if (sync) {
      resultOrError = this.getBlockByNumber("latest", false);
      if (resultOrError instanceof Error || resultOrError.error) return;
      this.onNewBlock(resultOrError);
      return resultOrError;
    }
    this.getBlockByNumber("latest", false, function (resultOrError) {
      if (resultOrError instanceof Error || resultOrError.error) return;
      this.onNewBlock(resultOrError);
      callback(resultOrError);
    }.bind(this));

  },

  /**
   * Check to see if the provided account is unlocked for the connected node.
   */
  unlocked: function (account, f) {
    var res;
    try {
      if (isFunction(f)) {
        this.sign(account, "0x00000000000000000000000000000000000000000000000000000000000f69b5", function (res) {
          if (res) {
            if (res.error) return f(false);
            return f(true);
          }
          f(false);
        });
      } else {
        res = this.sign(account, "0x00000000000000000000000000000000000000000000000000000000000f69b5");
        if (res) {
          if (res.error) {
            return false;
          }
          return true;
        }
        return false;
      }
    } catch (e) {
      if (isFunction(f)) return f(false);
      return false;
    }
  },

  /**
   * Invoke a function from a contract on the blockchain.
   *
   * Input tx format:
   * {
   *    from: <sender's address> (hexstring; optional, coinbase default)
   *    to: <contract address> (hexstring)
   *    method: <function name> (string)
   *    signature: <function signature, e.g. "iia"> (string)
   *    params: <parameters passed to the function> (optional)
   *    returns: <"number[]", "int", "BigNumber", or "string" (default)>
   *    send: <true to sendTransaction, false to call (default)>
   * }
   */
  invoke: function (payload, f) {
    var packaged, invocation;
    if (!payload || payload.constructor !== Object) {
      if (!isFunction(f)) return errors.TRANSACTION_FAILED;
      return f(errors.TRANSACTION_FAILED);
    }
    packaged = packageRequest(payload);
    if (this.debug.broadcast) packaged.debug = clone(payload);
    invocation = (payload.send) ? this.sendTx : this.call;
    return invocation.call(this, packaged, f);
  },

  /**
   * Wait for the specified number of blocks to appear before calling `callback`
   */
  fastforward: function (blocks, mine, callback) {
    var startBlock, endBlock, self = this;
    function fastforward() {
      self.blockNumber(function (blockNumber) {
        blockNumber = parseInt(blockNumber, 16);
        if (startBlock === undefined) {
          startBlock = blockNumber;
          endBlock = blockNumber + parseInt(blocks, 10);
        }
        if (blockNumber >= endBlock) {
          if (!mine) return callback(endBlock);
          self.miner("stop", [], function () {
            callback(endBlock);
          });
        } else {
          setTimeout(fastforward, constants.BLOCK_POLL_INTERVAL);
        }
      });
    }
    if (!callback && isFunction(mine)) {
      callback = mine;
      mine = null;
    }
    if (!mine) return fastforward();
    this.miner("start", [], fastforward);
  },

  /**
   * @typedef FirePayload
   * @type {object}
   * @property {!string} method
   * @property {?string} label
   * @property {!string} returns
   * @property {!string} from
   * @property {!string} to
   * @property {?string[]} params
   *
   * @param {FirePayload} payload
   * @param {function(object):void} callback - called with the result, possibly run through `wrapper` if applicable
   * @param {function(object,object):void} wrapper - a function to transform the result before it is passed to `callback`.  first parameter is result, second is `aux`
   * @param {object} aux - an optional parameter passed to `wrapper` (second parameter)
   */
  fire: function (payload, callback, wrapper, aux) {
    var tx, res, err, converted;
    tx = clone(payload);
    if (!isFunction(callback)) {
      res = this.invoke(tx);
      if (res === undefined || res === null) {
        throw new RPCError(errors.NO_RESPONSE);
      }
      err = handleRPCError(tx.method, tx.returns, res);
      if (err && err.error) throw new RPCError(err);
      converted = convertResponseToReturnsType(tx.returns, res);
      if (isFunction(wrapper)) return wrapper(converted, aux);
      return converted;
    }
    this.invoke(tx, function (res) {
      var err, converted;
      if (res === undefined || res === null) {
        return callback(errors.NO_RESPONSE);
      }
      err = handleRPCError(tx.method, tx.returns, res);
      if (err && err.error) return callback(err);
      converted = convertResponseToReturnsType(tx.returns, res);
      if (isFunction(wrapper)) converted = wrapper(converted, aux);
      return callback(converted);
    });
  },

  resend: function (tx, gasPrice, gasLimit, callback) {
    var newTx = clone(tx);
    if (gasPrice) newTx.gasPrice = abi.hex(gasPrice);
    if (gasLimit) newTx.gasLimit = abi.hex(gasLimit);
    return this.sendTransaction(newTx, callback);
  },

  resendRawTransaction: function (tx, privateKey, gasPrice, gasLimit, callback) {
    var newTx = clone(tx);
    if (gasPrice) newTx.gasPrice = abi.hex(gasPrice);
    if (gasLimit) newTx.gasLimit = abi.hex(gasLimit);
    return this.sendRawTransaction(this.signRawTransaction(tx, privateKey), callback);
  },

  /***************************************
   * Send-call-confirm callback sequence *
   ***************************************/

  updatePendingTx: function (tx) {
    var self = this;
    this.getTx(tx.hash, function (onChainTx) {
      var e;
      tx.tx = abi.copy(onChainTx);

      // if transaction is null, then it was dropped from the txpool
      if (onChainTx === null) {
        tx.payload.tries = (tx.payload.tries) ? tx.payload.tries + 1 : 1;

        // if we have retries left, then resubmit the transaction
        if (tx.payload.tries > constants.TX_RETRY_MAX) {
          tx.status = "failed";
          tx.locked = false;
          if (isFunction(tx.onFailed)) {
            e = clone(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
            e.hash = tx.hash;
            tx.onFailed(e);
          }
        } else {
          --self.rawTxMaxNonce;
          tx.status = "resubmitted";
          tx.locked = false;
          if (self.debug.tx) console.log("resubmitting tx:", tx.hash);
          self.transact(tx.payload, tx.onSent, tx.onSuccess, tx.onFailed);
        }

        // non-null transaction: transaction still alive and kicking!
        // check if it has been mined yet (block number is non-null)
      } else {
        if (onChainTx.blockNumber) {
          tx.tx.blockNumber = parseInt(onChainTx.blockNumber, 16);
          tx.tx.blockHash = onChainTx.blockHash;
          tx.status = "mined";
          tx.confirmations = self.block.number - tx.tx.blockNumber;
          self.updateMinedTx(tx);
        } else {
          tx.locked = false;
        }
      }
    });
  },

  updateMinedTx: function (tx) {
    var self = this;
    var onChainTx = tx.tx;
    tx.confirmations = self.block.number - onChainTx.blockNumber;
    if (self.debug.tx) console.log("confirmations for", tx.hash, tx.confirmations);
    if (tx.confirmations >= constants.REQUIRED_CONFIRMATIONS) {
      tx.status = "confirmed";
      if (isFunction(tx.onSuccess)) {
        self.getBlock(onChainTx.blockNumber, false, function (block) {
          if (block && block.timestamp) {
            onChainTx.timestamp = parseInt(block.timestamp, 16);
          }
          if (!tx.payload.mutable) {
            onChainTx.callReturn = tx.callReturn;
            self.getTransactionReceipt(tx.hash, function (receipt) {
              if (self.debug.tx) console.log("got receipt:", receipt);
              if (receipt && receipt.gasUsed) {
                onChainTx.gasFees = new BigNumber(receipt.gasUsed, 16)
                  .times(new BigNumber(onChainTx.gasPrice, 16))
                  .dividedBy(self.ETHER)
                  .toFixed();
              }
              tx.locked = false;
              tx.onSuccess(onChainTx);
            });
          } else {
            self.getLoggedReturnValue(tx.hash, function (err, log) {
              var e;
              if (self.debug.tx) console.log("loggedReturnValue:", err, log);
              if (err) {
                tx.payload.send = false;
                self.fire(tx.payload, function (callReturn) {
                  var e;
                  tx.locked = false;
                  if (isFunction(tx.onFailed)) {
                    if (err.error !== errors.NULL_CALL_RETURN.error) {
                      err.hash = tx.hash;
                      tx.onFailed(err);
                    } else {
                      e = handleRPCError(tx.payload.method, tx.payload.returns, callReturn);
                      e.hash = tx.hash;
                      tx.onFailed(e);
                    }
                  }
                });
              } else {
                e = handleRPCError(tx.payload.method, tx.payload.returns, log.returnValue);
                if (self.debug.tx) console.log("errorCodes:", e);
                if (e && e.error) {
                  e.gasFees = log.gasUsed.times(new BigNumber(onChainTx.gasPrice, 16)).dividedBy(self.ETHER).toFixed();
                  tx.locked = false;
                  if (isFunction(tx.onFailed)) {
                    e.hash = tx.hash;
                    tx.onFailed(e);
                  }
                } else {
                  onChainTx.callReturn = convertResponseToReturnsType(tx.payload.returns, log.returnValue);
                  onChainTx.gasFees = log.gasUsed.times(new BigNumber(onChainTx.gasPrice, 16)).dividedBy(self.ETHER).toFixed();
                  tx.locked = false;
                  tx.onSuccess(onChainTx);
                }
              }
            });
          }
        });
      } else {
        tx.locked = false;
      }
    } else {
      tx.locked = false;
    }
  },

  updateTx: function (tx) {
    if (!tx.locked) {
      if (tx.tx === undefined) {
        tx.locked = true;
        return this.updatePendingTx(tx);
      }
      switch (tx.status) {
        case "pending":
          tx.locked = true;
          this.updatePendingTx(tx);
          break;
        case "mined":
          tx.locked = true;
          this.updateMinedTx(tx);
          break;
        default:
          break;
      }
    }
  },

  verifyTxSubmitted: function (payload, txHash, callReturn, onSent, onSuccess, onFailed, callback) {
    var tx, self = this;
    if (!isFunction(callback)) {
      if (!payload || ((!payload.mutable && payload.returns !== "null") && (txHash === null || txHash === undefined))) {
        throw new RPCError(errors.TRANSACTION_FAILED);
      }
      if (this.txs[txHash]) throw new RPCError(errors.DUPLICATE_TRANSACTION);
      this.txs[txHash] = {
        hash: txHash,
        payload: payload,
        callReturn: callReturn,
        count: 0,
        status: "pending"
      };
      tx = this.getTransaction(txHash);
      if (!tx) throw new RPCError(errors.TRANSACTION_FAILED);
      this.txs[txHash].tx = tx;
      return;
    }
    if (!payload || txHash === null || txHash === undefined) {
      console.error("payload undefined or txhash null/undefined:", payload, txHash);
      return callback(errors.TRANSACTION_FAILED);
    }
    if (this.txs[txHash]) return callback(errors.DUPLICATE_TRANSACTION);
    this.txs[txHash] = {
      hash: txHash,
      payload: payload,
      callReturn: callReturn,
      onSent: onSent,
      onSuccess: onSuccess,
      onFailed: onFailed,
      count: 0,
      status: "pending"
    };
    if (this.block && this.block.number) {
      this.updateTx(this.txs[txHash]);
      return callback(null);
    }
    this.blockNumber(function (blockNumber) {
      if (!blockNumber || blockNumber.error) {
        return callback(blockNumber || "rpc.blockNumber lookup failed");
      }
      self.block = { number: parseInt(blockNumber, 16) };
      self.updateTx(self.txs[txHash]);
      callback(null);
    });
  },

  /**
   * asynchronous / non-blocking transact:
   *  - call onSent when the transaction is broadcast to the network
   *  - call onSuccess when the transaction has REQUIRED_CONFIRMATIONS
   *  - call onFailed if the transaction fails
   */
  transactAsync: function (payload, callReturn, onSent, onSuccess, onFailed) {
    var returns, self = this;
    payload.send = true;
    returns = payload.returns;
    delete payload.returns;
    (payload.invoke || this.invoke).call(this, payload, function (txHash) {
      if (self.debug.tx) console.log("txHash:", txHash);
      if (!txHash) return onFailed(errors.NULL_RESPONSE);
      if (txHash.error) return onFailed(txHash);
      payload.returns = returns;
      txHash = abi.format_int256(txHash);

      // send the transaction hash and return value back
      // to the client, using the onSent callback
      onSent({ hash: txHash, txHash: txHash, callReturn: callReturn });

      self.verifyTxSubmitted(payload, txHash, callReturn, onSent, onSuccess, onFailed, function (err) {
        if (err) {
          err.hash = txHash;
          return onFailed(err);
        }
      });
    });
  },

  waitForNextPoll: function (tx, callback) {
    var self = this;
    if (this.txs[tx.hash].count >= constants.TX_POLL_MAX) {
      this.txs[tx.hash].status = "unconfirmed";
      if (!isFunction(callback)) {
        throw new RPCError(errors.TRANSACTION_NOT_CONFIRMED);
      }
      return callback(errors.TRANSACTION_NOT_CONFIRMED);
    }
    if (!isFunction(callback)) {
      wait(constants.TX_POLL_INTERVAL);
      if (this.txs[tx.hash].status === "pending" || this.txs[tx.hash].status === "mined") {
        return null;
      }
    } else {
      this.notifications[tx.hash] = setTimeout(function () {
        if (self.txs[tx.hash].status === "pending" || self.txs[tx.hash].status === "mined") {
          callback(null, null);
        }
      }, constants.TX_POLL_INTERVAL);
    }
  },

  completeTx: function (tx, callback) {
    this.txs[tx.hash].status = "confirmed";
    clearTimeout(this.notifications[tx.hash]);
    delete this.notifications[tx.hash];
    if (!isFunction(callback)) return tx;
    return callback(null, tx);
  },

  checkConfirmations: function (tx, numConfirmations, callback) {
    var self = this;
    var minedBlockNumber = parseInt(tx.blockNumber, 16);
    this.blockNumber(function (currentBlockNumber) {
      if (self.debug.tx) {
        console.log("confirmations:", parseInt(currentBlockNumber, 16) - minedBlockNumber);
      }
      if (parseInt(currentBlockNumber, 16) - minedBlockNumber >= numConfirmations) {
        return self.completeTx(tx, callback);
      }
      return self.waitForNextPoll(tx, callback);
    });
  },

  checkBlockHash: function (tx, numConfirmations, callback) {
    if (!this.txs[tx.hash]) this.txs[tx.hash] = {};
    if (this.txs[tx.hash].count === undefined) this.txs[tx.hash].count = 0;
    ++this.txs[tx.hash].count;
    if (this.debug.tx) console.log("checkBlockHash:", tx.blockHash);
    if (tx && tx.blockHash && parseInt(tx.blockHash, 16) !== 0) {
      tx.txHash = tx.hash;
      if (!numConfirmations) {
        this.txs[tx.hash].status = "mined";
        clearTimeout(this.notifications[tx.hash]);
        delete this.notifications[tx.hash];
        if (!isFunction(callback)) return tx;
        return callback(null, tx);
      }
      return this.checkConfirmations(tx, numConfirmations, callback);
    }
    return this.waitForNextPoll(tx, callback);
  },

  getLoggedReturnValue: function (txHash, callback) {
    var receipt, log, self = this;
    if (!isFunction(callback)) {
      receipt = this.getTransactionReceipt(txHash);
      if (!receipt || !receipt.logs || !receipt.logs.length) {
        throw new RPCError(errors.NULL_CALL_RETURN);
      }
      log = receipt.logs[receipt.logs.length - 1];
      if (!log || log.data === null || log.data === undefined) {
        throw new RPCError(errors.NULL_CALL_RETURN);
      }
      return {
        returnValue: log.data,
        gasUsed: new BigNumber(receipt.gasUsed, 16)
      };
    }
    this.getTransactionReceipt(txHash, function (receipt) {
      var log;
      if (self.debug.tx) console.log("got receipt:", receipt);
      if (!receipt || !receipt.logs || !receipt.logs.length) {
        return callback(errors.NULL_CALL_RETURN);
      }
      log = receipt.logs[receipt.logs.length - 1];
      if (!log || log.data === null || log.data === undefined) {
        return callback(errors.NULL_CALL_RETURN);
      }
      callback(null, {
        returnValue: log.data,
        gasUsed: new BigNumber(receipt.gasUsed, 16)
      });
    });
  },

  txNotify: function (txHash, callback) {
    var tx, self = this;
    if (!isFunction(callback)) {
      tx = this.getTransaction(txHash);
      if (tx) return tx;
      --this.rawTxMaxNonce;
      this.txs[txHash].status = "resubmitted";
      return null;
    }
    this.getTransaction(txHash, function (tx) {
      if (tx) return callback(null, tx);
      --self.rawTxMaxNonce;
      self.txs[txHash].status = "failed";
      if (self.debug.broadcast) console.log(" *** Re-submitting transaction:", txHash);
      self.txs[txHash].status = "resubmitted";
      return callback(null, null);
    });
  },

  // poll the network until the transaction is included in a block
  // (i.e., has a non-null blockHash field)
  pollForTxConfirmation: function (txHash, numConfirmations, callback) {
    var tx, minedTx, self = this;
    if (!isFunction(callback)) {
      tx = this.txNotify(txHash);
      if (tx === null) return null;
      minedTx = this.checkBlockHash(tx, numConfirmations);
      if (minedTx !== null) return minedTx;
      return this.pollForTxConfirmation(txHash, numConfirmations);
    }
    this.txNotify(txHash, function (err, tx) {
      if (err) return callback(err);
      if (tx === null) return callback(null, null);
      self.checkBlockHash(tx, numConfirmations, function (err, minedTx) {
        if (err) return callback(err);
        if (minedTx !== null) return callback(null, minedTx);
        self.pollForTxConfirmation(txHash, numConfirmations, callback);
      });
    });
  },

  /**
   * synchronous transact: block until the transaction is confirmed or fails
   * (don't use this in the browser or you will be a sad panda)
   */
  transactSync: function (payload) {
    var callReturn, returns, txHash, tx, receipt, log, e;
    if (payload.mutable || payload.returns === "null") {
      callReturn = null;
    } else {
      callReturn = this.fire(payload);
      if (this.debug.tx) console.log("callReturn:", callReturn);
      if (callReturn === undefined || callReturn === null) {
        throw new RPCError(errors.NULL_CALL_RETURN);
      } else if (callReturn.error === "0x") {
        callReturn = null;
      } else if (callReturn.error) {
        throw new RPCError(callReturn);
      }
    }
    payload.send = true;
    returns = payload.returns;
    delete payload.returns;
    txHash = (payload.invoke || this.invoke).call(this, payload);
    if (this.debug.tx) console.log("txHash:", txHash);
    if (!txHash && !payload.mutable && payload.returns !== "null") {
      throw new RPCError(errors.NULL_RESPONSE);
    } else if (txHash && txHash.error) {
      throw new RPCError(txHash);
    }
    payload.returns = returns;
    txHash = abi.format_int256(txHash);
    this.verifyTxSubmitted(payload, txHash, callReturn);
    tx = this.pollForTxConfirmation(txHash, null);
    if (tx === null) {
      payload.tries = (payload.tries) ? payload.tries + 1 : 1;
      if (payload.tries > constants.TX_RETRY_MAX) {
        throw new RPCError(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
      }
      return this.transact(payload);
    }
    tx.timestamp = parseInt(this.getBlock(tx.blockNumber, false).timestamp, 16);
    if (!payload.mutable) {
      tx.callReturn = callReturn;
      receipt = this.getTransactionReceipt(txHash);
      if (this.debug.tx) console.log("got receipt:", receipt);
      if (receipt && receipt.gasUsed) {
        tx.gasFees = new BigNumber(receipt.gasUsed, 16)
          .times(new BigNumber(tx.gasPrice, 16))
          .dividedBy(this.ETHER)
          .toFixed();
      }
      return tx;
    }

    // if mutable return value, then lookup logged return
    // value in transaction receipt (after confirmation)
    log = this.getLoggedReturnValue(txHash);
    e = handleRPCError(payload.method, payload.returns, log.returnValue);
    if (e && e.error) {
      e.gasFees = log.gasUsed.times(new BigNumber(tx.gasPrice, 16)).dividedBy(this.ETHER).toFixed();
      if (e.error !== errors.NULL_CALL_RETURN.error) {
        throw new RPCError(e);
      }
      callReturn = this.fire(payload);
      throw new RPCError(handleRPCError(payload.method, payload.returns, callReturn));
    }
    tx.callReturn = convertResponseToReturnsType(payload.returns, log.returnValue);
    tx.gasFees = log.gasUsed.times(new BigNumber(tx.gasPrice, 16)).dividedBy(this.ETHER).toFixed();
    return tx;
  },

  transact: function (payload, onSent, onSuccess, onFailed) {
    var cb, self = this;
    if (this.debug.tx) console.log("payload transact:", payload);
    payload.send = false;

    // synchronous / blocking transact sequence
    if (!isFunction(onSent)) return this.transactSync(payload);

    // asynchronous / non-blocking transact sequence
    cb = (isFunction(this.txRelay)) ? {
      sent: this.wrapTxRelayCallback("sent", payload, onSent),
      success: this.wrapTxRelayCallback("success", payload, onSuccess),
      failed: this.wrapTxRelayCallback("failed", payload, onFailed)
    } : {
      sent: onSent,
      success: (isFunction(onSuccess)) ? onSuccess : noop,
      failed: (isFunction(onFailed)) ? onFailed : noop
    };
    if (payload.mutable || payload.returns === "null") {
      return this.transactAsync(payload, null, cb.sent, cb.success, cb.failed);
    }
    this.fire(payload, function (callReturn) {
      if (self.debug.tx) console.log("callReturn:", callReturn);
      if (callReturn === undefined || callReturn === null) {
        return cb.failed(errors.NULL_CALL_RETURN);
      } else if (callReturn.error) {
        return cb.failed(callReturn);
      }
      self.transactAsync(payload, callReturn, cb.sent, cb.success, cb.failed);
    });
  }
};
