/**
 * JSON RPC methods for Ethereum
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var clone = require("clone");
var EthTx = require("ethereumjs-tx");
var BigNumber = require("bignumber.js");
var keccak_256 = require("js-sha3").keccak_256;
var abi = require("augur-abi");
var BlockAndLogStreamer = require("ethereumjs-blockstream").BlockAndLogStreamer;
var BlockNotifier = require("./block-management/block-notifier.js");
var createTransportAdapter = require("./block-management/ethrpc-transport-adapter.js");
var errors = require("./errors.json");
var ErrorWithData = require("./errors.js").ErrorWithData;
var ErrorWithCodeAndData = require("./errors.js").ErrorWithCodeAndData;
var Transporter = require("./transport/transporter.js");

BigNumber.config({
  MODULO_MODE: BigNumber.EUCLID,
  ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN
});

function RPCError(err) {
  this.name = "RPCError";
  this.error = err.error;
  this.message = JSON.stringify(err);
}

RPCError.prototype = Error.prototype;

function isFunction(f) {
  return typeof f === "function";
}

function wait(delay) {
  var until = new Date().getTime() + delay;
  while (new Date().getTime() < until) { }
  return;
}

var noop = function () { };

module.exports = {

  debug: {
    connect: false,
    tx: false,
    broadcast: false,
    nonce: false,
    sync: false
  },

  // if set to true, dropped transactions are automatically resubmitted
  retryDroppedTxs: true,

  // Number of required confirmations for transact sequence
  REQUIRED_CONFIRMATIONS: 0,

  // Maximum number of retry attempts for dropped transactions
  TX_RETRY_MAX: 5,

  // Maximum number of transaction verification attempts
  TX_POLL_MAX: 1000,

  // Transaction polling interval
  TX_POLL_INTERVAL: 10000,

  // how frequently to poll when waiting for blocks
  BLOCK_POLL_INTERVAL: 30000,

  // Default timeout for asynchronous POST
  POST_TIMEOUT: 30000,

  DEFAULT_GAS: "0x2fd618",

  ETHER: new BigNumber(10, 10).toPower(18),

  Error: RPCError,

  errors: errors,

  gasPrice: 20000000000,

  requests: null,

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
    this.resetState();

    // overwrite configuration values with user config, throw away unused user config
    for (var key in this.configuration) {
      if (!this.configuration.hasOwnProperty(key)) continue;
      if (configuration[key] === undefined || configuration[key] === null) continue;
      this.configuration[key] = configuration[key];
    }

    // use default (console.error) error handler if not set
    if (!isFunction(this.configuration.errorHandler)) {
      this.configuration.errorHandler = function (err) { console.error(err); };
    }

    // validate configuration
    if (!Array.isArray(this.configuration.httpAddresses)) return this.configuration.errorHandler(new Error("configuration.httpAddresses must be an array."));
    if (this.configuration.httpAddresses.some(function (x) { return typeof x !== "string"; })) return this.configuration.errorHandler(new Error("configuration.httpAddresses must contain only strings."));
    if (!Array.isArray(this.configuration.wsAddresses)) return this.configuration.errorHandler(new Error("configuration.wsAddresses must be an array."));
    if (this.configuration.wsAddresses.some(function (x) { return typeof x !== "string"; })) return this.configuration.errorHandler(new Error("configuration.wsAddresses must contain only strings."));
    if (!Array.isArray(this.configuration.ipcAddresses)) return this.configuration.errorHandler(new Error("configuration.ipcAddresses must be an array."));
    if (this.configuration.ipcAddresses.some(function (x) { return typeof x !== "string"; })) return this.configuration.errorHandler(new Error("configuration.ipcAddresses must contain only strings."));

    var syncOnly = !initialConnectCallback;
    if (syncOnly) initialConnectCallback = function (error) { if (error instanceof Error) throw error; else if (error) throw new ErrorWithData(error); };

    // initialize the transporter, this will be how we send to and receive from the blockchain
    /* jshint nonew: false */
    new Transporter(this.configuration, this.internalState.shimMessageHandler, syncOnly, this.debug.connect, function (error, transporter) {
      if (error !== null) return initialConnectCallback(error);
      this.internalState.transporter = transporter;
      // ensure we can do basic JSON-RPC over this connection
      this.version(function (errorOrResult) {
        if (errorOrResult instanceof Error || errorOrResult.error) return initialConnectCallback(errorOrResult);
        this.createBlockAndLogStreamer({ pollingIntervalMilliseconds: configuration.pollingIntervalMilliseconds, blockRetention: configuration.blockRetention }, createTransportAdapter(this));
        this.internalState.blockAndLogStreamer.subscribeToOnBlockAdded(this.onNewBlock.bind(this));
        initialConnectCallback(null);
      }.bind(this));
    }.bind(this));
  },

  /**
   * Resets the global state of this module to default.
   */
  resetState: function() {
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
      errorHandler: null,
    };

    // destroy the old BlockNotifier so it doesn't try to reconnect or continue polling
    (((this.internalState || {}).blockNotifier || {}).destroy || function () {})();

    // redirect any not-yet-received responses to /dev/null
    var oldMessageHandlerObject = (this.internalState || {}).shimMessageHandlerObject || {};
    var newMessageHandlerObject = { realMessageHandler: this.blockchainMessageHandler.bind(this) };
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
      // by binding this function to `shimMessageHandlerObject`, its `this` value will be a pointer to an object that we can mutate before replacing when reset
      shimMessageHandler: function (error, jso) { this.realMessageHandler(error, jso); }.bind(newMessageHandlerObject)
    };

    // reset public state
    this.block = null;
    this.excludedFromTxRelay = {};
    this.gasPrice = 20000000000;
    this.notifications = {};
    this.rawTxMaxNonce = -1;
    this.requests = 1;
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
    var syncErrorOrResult;
    if (transportRequirements === "SYNC") callback = function (error, result) { return (syncErrorOrResult = (error || result)); };

    if (isFunction(transportRequirements) && !callback) {
      callback = transportRequirements;
      transportRequirements = null;
    }

    if (!isFunction(callback)) throw new Error("callback must be a function");
    if (typeof transportRequirements !== "string" && transportRequirements !== null) return callback(new Error("transportRequirements must be null or a string"));
    if (typeof jso !== "object") return callback(new Error("jso must be an object"));
    if (typeof jso.id !== "number") return callback(new Error("jso.id must be a number"));

    // FIXME: return types shouldn't be embedded into the RPC JSO
    var expectedReturnTypes = this.strip(jso);
    this.internalState.outstandingRequests[jso.id] = {
      jso: jso,
      expectedReturnTypes: expectedReturnTypes,
      callback: callback
    };

    this.internalState.transporter.blockchainRpc(jso, transportRequirements, this.debug.broadcast);

    if (transportRequirements === "SYNC") {
      if (typeof this.internalState.outstandingRequests[jso.id] !== "undefined") return new Error("SYNC request didn't receive messageHandler call before returning.");
      return syncErrorOrResult;
    }
  },

  /**
   * Used internally.  Processes a response from the blockchain by looking up the associated callback and calling it.
   */
  blockchainMessageHandler: function (error, jso) {
    if (error !== null)
      return this.configuration.errorHandler(error);
    if (typeof jso !== "object")
      return this.configuration.errorHandler(new ErrorWithData("Unexpectedly received a message from the transport that was not an object.", jso));

    var subscriptionHandler = function () {
      if (jso.method !== "eth_subscription")
        return this.configuration.errorHandler(new ErrorWithData("Received an RPC request that wasn't an `eth_subscription`.", jso));
      if (typeof jso.params.subscription !== "string")
        return this.configuration.errorHandler(new ErrorWithData("Received an `eth_subscription` request without a subscription ID.", jso));
      if (jso.params.result === null || jso.params.result === undefined)
        return this.configuration.errorHandler(new ErrorWithData("Received an `eth_subscription` request without a result.", jso));

      var subscriptionCallback = this.internalState.subscriptions[jso.params.subscription];
      if (subscriptionCallback)
        subscriptionCallback(jso.params.result);
    }.bind(this);

    var responseHandler = function () {
      if (typeof jso.id !== "number")
        return this.configuration.errorHandler(new ErrorWithData("Received a message from the blockchain that didn't have a valid id.", jso));
      var outstandingRequest = this.internalState.outstandingRequests[jso.id];
      delete this.internalState.outstandingRequests[jso.id];
      if (typeof outstandingRequest !== "object")
        return this.configuration.errorHandler(new ErrorWithData("Unable to locate original request for blockchain response.", jso));

      // FIXME: outstandingRequest.callback should be function(Error,object) not function(Error|object)
      this.parse(jso, outstandingRequest.expectedReturnTypes, outstandingRequest.callback);
    }.bind(this);

    var errorHandler = function () {
      // errors with IDs can go through the normal result process
      if (jso.id !== null && jso.id !== undefined)
        return responseHandler.bind(this)(jso);
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
    this.internalState.blockNotifier = new BlockNotifier(transport, configuration.pollingIntervalMilliseconds);
    this.internalState.blockAndLogStreamer = BlockAndLogStreamer.createCallbackStyle(transport.getBlockByHash, transport.getLogs, { blockRetention: configuration.blockRetention });
    var reconcileWithErrorLogging = function (block) { this.internalState.blockAndLogStreamer.reconcileNewBlockCallbackStyle(block, function (error) { if (error) console.log(error); }); }.bind(this);
    this.internalState.blockNotifier.subscribe(reconcileWithErrorLogging);
  },

  /**
   * Provides access to the internally managed BlockAndLogStreamer instance.
   */
  getBlockAndLogStreamer: function () {
    return this.internalState.blockAndLogStreamer;
  },

  onNewBlock: function (block) {
    if (typeof block !== "object") throw new Error("block must be an object");

    // for legacy compatability, use getBlockAndLogStream().getLatestReconciledBlock()
    this.block = clone(block);
    // FIXME: ethrpc should really store the original block and add getters for making it easier to interact with
    this.block.number = parseInt(block.number, 16);

    // re-process all transactions
    for (var transactionHash in this.txs) {
      var transaction = this.txs[transactionHash];
      this.updateTx(transaction);
    }
  },




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
    if (method) {
      if (method.constructor === Array && method.length) {
        for (var i = 0, numMethods = method.length; i < numMethods; ++i) {
          this.excludedFromTxRelay[method[i]] = true;
        }
      } else {
        this.excludedFromTxRelay[method] = true;
      }
    }
  },

  includeInTxRelay: function (method) {
    if (method) {
      if (method.constructor === Array && method.length) {
        for (var i = 0, numMethods = method.length; i < numMethods; ++i) {
          this.excludedFromTxRelay[method[i]] = false;
        }
      } else {
        this.excludedFromTxRelay[method] = false;
      }
    }
  },

  unmarshal: function (string, returns, stride, init) {
    var elements, array, position;
    if (string && string.length >= 66) {
      stride = stride || 64;
      elements = Math.ceil((string.length - 2) / stride);
      array = new Array(elements);
      position = init || 2;
      for (var i = 0; i < elements; ++i) {
        array[i] = abi.prefix_hex(string.slice(position, position + stride));
        position += stride;
      }
      if (array.length) {
        if (parseInt(array[1], 16) === array.length - 2 || parseInt(array[1], 16) / 32 === array.length - 2) {
          array.splice(0, 2);
        }
      }
      for (i = 0; i < array.length; ++i) {
        if (returns === "number[]") {
          array[i] = abi.string(array[i]);
        } else if (returns === "unfix[]") {
          array[i] = abi.unfix_signed(array[i], "string");
        }
      }
      return array;
    } else {
      return string;
    }
  },

  applyReturns: function (returns, result) {
    var res;
    if (!returns) return result;
    if (result && result !== "0x") {
      if (result.error) return result;
      returns = returns.toLowerCase();
      res = clone(result);
      if (returns && returns.slice(-2) === "[]") {
        res = this.unmarshal(res, returns);
        if (returns === "hash[]") res = abi.hex(res);
      } else if (returns === "string") {
        res = abi.raw_decode_hex(res);
      } else if (returns === "number") {
        res = abi.string(res, true);
      } else if (returns === "int") {
        res = abi.number(res, true);
      } else if (returns === "bignumber") {
        res = abi.bignum(res, null, true);
      } else if (returns === "unfix") {
        res = abi.unfix_signed(res, "string");
      } else if (returns === "null") {
        res = null;
      } else if (returns === "address" || returns === "address[]") {
        res = abi.format_address(res);
      }
    } else {
      res = result;
    }
    return res;
  },

  parse: function (origResponse, returns, callback) {
    var results, len, err;
    var response = clone(origResponse);
    if ((this.debug.tx && (response && response.error)) || this.debug.broadcast) {
      console.log("[ethrpc] response:", response);
    }
    if (response && typeof response === "string") {
      try {
        response = JSON.parse(response);
      } catch (e) {
        err = e;
        if (e && e.name === "SyntaxError") {
          err = errors.INVALID_RESPONSE;
        }
        if (isFunction(callback)) return callback(err);
        throw new this.Error(err);
      }
    }
    if (response !== undefined && typeof response === "object" && response !== null) {
      if (response.error) {
        response = {
          error: response.error.code,
          message: response.error.message
        };
        if (!isFunction(callback)) return response;
        return callback(response);
      } else if (response.result !== undefined) {
        if (!isFunction(callback)) return response.result;
        return callback(response.result);
      } else if (response.constructor === Array && response.length) {
        len = response.length;
        results = new Array(len);
        for (var i = 0; i < len; ++i) {
          results[i] = response[i].result;
          if (response.error || (response[i] && response[i].error)) {
            if (this.debug.broadcast) {
              if (isFunction(callback)) return callback(response.error);
              throw new this.Error(response.error);
            }
          }
        }
        if (!isFunction(callback)) return results;
        return callback(results);
      }

      // no result or error field
      err = errors.NO_RESPONSE;
      err.bubble = response;
      if (isFunction(callback)) return callback(err);
      throw new this.Error(err);
    }
  },

  strip: function (tx) {
    var returns;
    if (tx.method === "eth_coinbase") return "address";
    if (tx.params !== undefined && tx.params.length && tx.params[0]) {
      if (tx.params[0].returns) {
        returns = tx.params[0].returns;
        delete tx.params[0].returns;
      }
      if (tx.params[0].invocation) {
        delete tx.params[0].invocation;
      }
    }
    return returns;
  },

  subscriptions: {},

  unregisterSubscriptionCallback: function (id) {
    delete this.internalState.subscriptions[id];
  },

  registerSubscriptionCallback: function (id, callback) {
    this.internalState.subscriptions[id] = callback;
  },

  marshal: function (command, params, prefix) {
    var payload, action;
    if (prefix === "null" || prefix === null) {
      action = command.toString();
    } else {
      action = (prefix || "eth_") + command.toString();
    }
    payload = {
      id: this.requests++,
      jsonrpc: "2.0",
      method: action
    };
    if (params === undefined) params = [];
    if (params === null) params = [];
    if (this.debug.broadcast && params.debug) {
      payload.debug = clone(params.debug);
      delete params.debug;
    }
    if (params.timeout) {
      payload.timeout = params.timeout;
      delete params.timeout;
    }
    payload.params = (params instanceof Array) ? ethereumEncodeArray(params) : [ethereumEncodePrimitive(params)];
    return payload;
  },

  // delete cached network, notification, and transaction data
  clear: function () {
    this.txs = {};
    for (var n in this.notifications) {
      if (!this.notifications.hasOwnProperty(n)) continue;
      if (this.notifications[n]) {
        clearTimeout(this.notifications[n]);
      }
    }
    this.notifications = {};
    this.txs = {};
    this.rawTxMaxNonce = -1;
  },

  /******************************
   * Ethereum JSON-RPC bindings *
   ******************************/

  raw: function (command, params, callback) {
    var transportRequirements = "ANY";
    if (!callback) transportRequirements = "SYNC";
    return this.submitRequestToBlockchain(this.marshal(command, params, null), transportRequirements, callback);
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
    return this.eth("getBlockByHash", [hash, !!shouldReturnFullTransactions], callback);
  },

  getBlockByNumber: function (number, shouldReturnFullTransactions, callback) {
    if (shouldReturnFullTransactions !== true) shouldReturnFullTransactions = false;
    var block = validateAndDefaultBlockNumber(number);
    return this.eth("getBlockByNumber", [block, !!shouldReturnFullTransactions], callback);
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
    if (/^[0-9a-fA-F]*$/.test(signedTransaction)) signedTransaction = "0x" + signedTransaction;
    if (!/^0x[0-9a-fA-F]*$/.test(signedTransaction)) throw new Error("signedTransaction must be RLP encoded hex byte array encoded into a string");
    return this.eth("sendRawTransaction", [signedTransaction], callback);
  },

  /**
   * @param {{from:string, to:string, gas:number, gasPrice:number, value:number, data:string, nonce:number, minBlock:number|string}} transaction
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
    var sync = (!callback);
    if (sync) {
      var resultOrError = this.getBlockByNumber("latest", false);
      if (resultOrError instanceof Error || resultOrError.error) return;
      this.onNewBlock(resultOrError);
      return resultOrError;
    } else {
      this.getBlockByNumber("latest", false, function (resultOrError) {
        if (resultOrError instanceof Error || resultOrError.error) return;
        this.onNewBlock(resultOrError);
        callback(resultOrError);
      }.bind(this));
    }
  },

  /**
   * Check to see if the provided account is unlocked for the connected node.
   */
  unlocked: function (account, f) {
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
        var res = this.sign(account, "0x00000000000000000000000000000000000000000000000000000000000f69b5");
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
    if (!payload || payload.constructor !== Object) {
      if (!isFunction(f)) return errors.TRANSACTION_FAILED;
      return f(errors.TRANSACTION_FAILED);
    }
    var packaged = this.packageRequest(payload);
    if (this.debug.broadcast) packaged.debug = clone(payload);
    var invocation = (payload.send) ? this.sendTx : this.call;
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
          endBlock = blockNumber + parseInt(blocks);
        }
        if (blockNumber >= endBlock) {
          if (!mine) return callback(endBlock);
          self.miner("stop", [], function () {
            callback(endBlock);
          });
        } else {
          setTimeout(fastforward, self.BLOCK_POLL_INTERVAL);
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
    var self = this;
    var tx = clone(payload);
    if (!isFunction(callback)) {
      var res = this.invoke(tx);
      if (res === undefined || res === null) {
        throw new this.Error(errors.NO_RESPONSE);
      }
      var err = this.errorCodes(tx.method, tx.returns, res);
      if (err && err.error) throw new this.Error(err);
      var converted = this.applyReturns(tx.returns, res);
      if (isFunction(wrapper)) return wrapper(converted, aux);
      return converted;
    }
    this.invoke(tx, function (res) {
      if (res === undefined || res === null) {
        return callback(errors.NO_RESPONSE);
      }
      var err = self.errorCodes(tx.method, tx.returns, res);
      if (err && err.error) return callback(err);
      var converted = self.applyReturns(tx.returns, res);
      if (isFunction(wrapper)) converted = wrapper(converted, aux);
      return callback(converted);
    });
  },

  packageRequest: function (payload) {
    var tx = clone(payload);
    if (tx.params === undefined || tx.params === null) {
      tx.params = [];
    } else if (tx.params.constructor !== Array) {
      tx.params = [tx.params];
    }
    var numParams = tx.params.length;
    if (numParams) {
      if (tx.signature && tx.signature.length !== numParams) {
        throw new this.Error(errors.PARAMETER_NUMBER_ERROR);
      }
      for (var j = 0; j < numParams; ++j) {
        if (tx.params[j] !== undefined && tx.params[j] !== null && tx.signature[j]) {
          if (tx.params[j].constructor === Number) {
            tx.params[j] = abi.prefix_hex(tx.params[j].toString(16));
          }
          if (tx.signature[j] === "int256") {
            tx.params[j] = abi.unfork(tx.params[j], true);
          } else if (tx.signature[j] === "int256[]" &&
            tx.params[j].constructor === Array && tx.params[j].length) {
            for (var k = 0, arrayLen = tx.params[j].length; k < arrayLen; ++k) {
              tx.params[j][k] = abi.unfork(tx.params[j][k], true);
            }
          }
        }
      }
    }
    if (tx.to) tx.to = abi.format_address(tx.to);
    if (tx.from) tx.from = abi.format_address(tx.from);
    var packaged = {
      from: tx.from,
      to: tx.to,
      data: abi.encode(tx),
      gas: tx.gas ? abi.hex(tx.gas) : this.DEFAULT_GAS
    };
    if (tx.gasPrice) packaged.gasPrice = abi.hex(tx.gasPrice);
    if (tx.timeout) packaged.timeout = abi.hex(tx.timeout);
    if (tx.value) packaged.value = abi.hex(tx.value);
    if (tx.returns) packaged.returns = tx.returns;
    if (tx.nonce) packaged.nonce = tx.nonce;
    return packaged;
  },

  errorCodes: function (method, returns, response) {
    if (response) {
      if (response.constructor === Array) {
        for (var i = 0, len = response.length; i < len; ++i) {
          response[i] = this.errorCodes(method, returns, response[i]);
        }
      } else if (response.name && response.message && response.stack) {
        response.error = response.name;
      } else if (!response.error) {
        if (returns && returns.indexOf("[]") > -1) {
          if (response.length >= 194) {
            response = "0x" + response.slice(130, 194);
          }
        }
        if (errors[response]) {
          response = {
            error: response,
            message: errors[response]
          };
        } else {
          if (returns !== "null" && returns !== "string" ||
            (response && response.constructor === String &&
              response.slice(0, 2) === "0x")) {
            var responseNumber = abi.bignum(response, "string", true);
            if (responseNumber) {
              if (errors[method] && errors[method][responseNumber]) {
                response = {
                  error: responseNumber,
                  message: errors[method][responseNumber]
                };
              }
            }
          }
        }
      }
    }
    return response;
  },

  /********************
   * Raw transactions *
   ********************/

  /**
   * Validate and submit a signed raw transaction to the network.
   * @param {Object} rawTransactionResponse Error response from the Ethereum node.
   * @return {Object|null} Error or null if retrying due to low nonce.
   */
  handleRawTransactionError: function (rawTransactionResponse) {
    if (rawTransactionResponse.message.indexOf("rlp") > -1) {
      return errors.RLP_ENCODING_ERROR;
    } else if (rawTransactionResponse.message.indexOf("Nonce too low") > -1) {
      if (this.debug.broadcast || this.debug.nonce) {
        console.info("[ethrpc] nonce too low:", this.rawTxMaxNonce);
      }
      ++this.rawTxMaxNonce;
      return null;
    }
    return rawTransactionResponse;
  },

  /**
   * Validate and submit a signed raw transaction to the network.
   * @param {Object} signedRawTransaction Unsigned transaction.
   * @param {function=} callback Callback function (optional).
   * @return {string|Object} Response (tx hash or error) from the Ethereum node.
   */
  submitSignedRawTransaction: function (signedRawTransaction, callback) {
    if (!signedRawTransaction.validate()) {
      if (!isFunction(callback)) throw new RPCError(errors.TRANSACTION_INVALID);
      return callback(errors.TRANSACTION_INVALID);
    }
    return this.sendRawTransaction(signedRawTransaction.serialize().toString("hex"), callback);
  },

  /**
   * Sign the transaction using the private key.
   * @param {Object} packaged Unsigned transaction.
   * @param {buffer} privateKey The sender's plaintext private key.
   * @return {string} Signed and serialized raw transaction.
   */
  signRawTransaction: function (packaged, privateKey) {
    var rawTransaction = new EthTx(packaged);
    rawTransaction.sign(privateKey);
    if (this.debug.tx || this.debug.broadcast) {
      console.log("raw nonce:    0x" + rawTransaction.nonce.toString("hex"));
      console.log("raw gasPrice: 0x" + rawTransaction.gasPrice.toString("hex"));
      console.log("raw gasLimit: 0x" + rawTransaction.gasLimit.toString("hex"));
      console.log("raw to:       0x" + rawTransaction.to.toString("hex"));
      console.log("raw value:    0x" + rawTransaction.value.toString("hex"));
      console.log("raw v:        0x" + rawTransaction.v.toString("hex"));
      console.log("raw r:        0x" + rawTransaction.r.toString("hex"));
      console.log("raw s:        0x" + rawTransaction.s.toString("hex"));
      console.log("raw data:     0x" + rawTransaction.data.toString("hex"));
    }
    if (!rawTransaction.validate()) {
      throw new RPCError(errors.TRANSACTION_INVALID);
    }
    return rawTransaction.serialize().toString("hex");
  },

  /**
   * Compare nonce to the maximum nonce seen so far.
   * @param {number} nonce Raw transaction nonce as a base 10 integer.
   * @return {string} Adjusted (if needed) nonce as a hex string.
   */
  verifyRawTransactionNonce: function (nonce) {
    if (nonce <= this.rawTxMaxNonce) {
      nonce = ++this.rawTxMaxNonce;
    } else {
      this.rawTxMaxNonce = nonce;
    }
    if (this.debug.nonce) console.log("[ethrpc] nonce:", nonce, this.rawTxMaxNonce);
    return abi.hex(nonce);
  },

  /**
   * Use the number of transactions from this account to set the nonce.
   * @param {Object} packaged Packaged transaction.
   * @param {string} address The sender's Ethereum address.
   * @param {function=} callback Callback function (optional).
   * @return {Object} Packaged transaction with nonce set.
   */
  setRawTransactionNonce: function (packaged, address, callback) {
    var transactionCount, self = this;
    if (!isFunction(callback)) {
      transactionCount = this.pendingTxCount(address);
      if (this.debug.nonce) {
        console.log("[ethrpc] transaction count:", parseInt(transactionCount, 16));
      }
      if (transactionCount && !transactionCount.error && !(transactionCount instanceof Error)) {
        packaged.nonce = parseInt(transactionCount, 16);
      }
      packaged.nonce = this.verifyRawTransactionNonce(packaged.nonce);
      return packaged;
    }
    this.pendingTxCount(address, function (transactionCount) {
      if (self.debug.nonce) {
        console.log("[ethrpc] transaction count:", parseInt(transactionCount, 16));
      }
      if (transactionCount && !transactionCount.error && !(transactionCount instanceof Error)) {
        packaged.nonce = parseInt(transactionCount, 16);
      }
      packaged.nonce = self.verifyRawTransactionNonce(packaged.nonce);
      callback(packaged);
    });
  },

  /**
   * Set the gas price for a raw transaction.
   * @param {Object} packaged Packaged transaction.
   * @param {function=} callback Callback function (optional).
   * @return {Object} Packaged transaction with gasPrice set.
   */
  setRawTransactionGasPrice: function (packaged, callback) {
    var gasPrice;
    if (!isFunction(callback)) {
      if (packaged.gasPrice) return packaged;
      gasPrice = this.getGasPrice();
      if (!gasPrice || gasPrice.error) throw new RPCError(errors.TRANSACTION_FAILED);
      packaged.gasPrice = gasPrice;
      return packaged;
    }
    if (packaged.gasPrice) return callback(packaged);
    this.getGasPrice(function (gasPrice) {
      if (!gasPrice || gasPrice.error) return callback(errors.TRANSACTION_FAILED);
      packaged.gasPrice = gasPrice;
      callback(packaged);
    });
  },

  /**
   * Package a raw transaction.
   * @param {Object} payload Static API data with "params" and "from" set.
   * @param {string} address The sender's Ethereum address.
   * @return {Object} Packaged transaction.
   */
  packageRawTransaction: function (payload, address) {
    var packaged = this.packageRequest(payload);
    packaged.from = address;
    packaged.nonce = payload.nonce || 0;
    packaged.value = payload.value || "0x0";
    if (payload.gasLimit) {
      packaged.gasLimit = abi.hex(payload.gasLimit);
    } else if (this.block && this.block.gasLimit) {
      packaged.gasLimit = abi.hex(this.block.gasLimit);
    } else {
      packaged.gasLimit = this.DEFAULT_GAS;
    }
    if (this.networkID && parseInt(this.networkID, 10) < 109) {
      packaged.chainId = parseInt(this.networkID, 10);
    }
    if (this.debug.broadcast) console.log("[ethrpc] payload:", payload);
    if (payload.gasPrice && abi.number(payload.gasPrice) > 0) {
      packaged.gasPrice = abi.hex(payload.gasPrice);
    }
    return packaged;
  },

  /**
   * Package and sign a raw transaction.
   * @param {Object} payload Static API data with "params" and "from" set.
   * @param {string} address The sender's Ethereum address.
   * @param {buffer} privateKey The sender's plaintext private key.
   * @param {function=} callback Callback function (optional).
   * @return {string} Signed transaction.
   */
  packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
    var packaged, self = this;
    if (!payload || payload.constructor !== Object) {
      if (!isFunction(callback)) throw new RPCError(errors.TRANSACTION_FAILED);
      return callback(errors.TRANSACTION_FAILED);
    }
    if (!address || !privateKey) {
      if (!isFunction(callback)) throw new RPCError(errors.NOT_LOGGED_IN);
      return callback(errors.NOT_LOGGED_IN);
    }
    packaged = this.packageRawTransaction(payload, address);
    if (payload.gasPrice) packaged.gasPrice = payload.gasPrice;
    if (this.debug.broadcast) {
      console.log("[ethrpc] packaged:", JSON.stringify(packaged, null, 2));
    }
    if (!isFunction(callback)) {
      return this.signRawTransaction(
        this.setRawTransactionNonce(this.setRawTransactionGasPrice(packaged), address),
        privateKey
      );
    }
    this.setRawTransactionGasPrice(packaged, function (packaged) {
      if (packaged.error) return callback(packaged);
      self.setRawTransactionNonce(packaged, address, function (packaged) {
        var signedRawTransaction;
        try {
          signedRawTransaction = self.signRawTransaction(packaged, privateKey);
        } catch (exc) {
          signedRawTransaction = exc;
        }
        callback(signedRawTransaction);
      });
    });
  },

  /**
   * Package, sign, and submit a raw transaction to Ethereum.
   * @param {Object} payload Static API data with "params" and "from" set.
   * @param {string} address The sender's Ethereum address.
   * @param {buffer} privateKey The sender's plaintext private key.
   * @param {function=} callback Callback function (optional).
   * @return {string} Transaction hash (if successful).
   */
  packageAndSubmitRawTransaction: function (payload, address, privateKey, callback) {
    var response, err, self = this;
    if (!isFunction(callback)) {
      response = this.sendRawTransaction(this.packageAndSignRawTransaction(payload, address, privateKey));
      if (this.debug.broadcast) console.log("[ethrpc] sendRawTransaction", response);
      if (!response) throw new RPCError(errors.RAW_TRANSACTION_ERROR);
      if (response.error) {
        err = this.handleRawTransactionError(response);
        if (err !== null) throw new RPCError(err);
        return this.packageAndSubmitRawTransaction(payload, address, privateKey);
      }
      return response;
    }
    this.packageAndSignRawTransaction(payload, address, privateKey, function (signedRawTransaction) {
      if (signedRawTransaction.error) return callback(signedRawTransaction);
      self.sendRawTransaction(signedRawTransaction, function (response) {
        var err;
        if (self.debug.broadcast) console.log("[ethrpc] sendRawTransaction", response);
        if (!response) return callback(errors.RAW_TRANSACTION_ERROR);
        if (response.error) {
          err = self.handleRawTransactionError(response);
          if (err !== null) return callback(err);
          self.packageAndSubmitRawTransaction(payload, address, privateKey, callback);
        } else {
          callback(response);
        }
      });
    });
  },

  /***************************************
   * Send-call-confirm callback sequence *
   ***************************************/

  updatePendingTx: function (tx) {
    var self = this;
    this.getTx(tx.hash, function (onChainTx) {
      tx.tx = abi.copy(onChainTx);

      // if transaction is null, then it was dropped from the txpool
      if (onChainTx === null) {
        tx.payload.tries = (tx.payload.tries) ? tx.payload.tries + 1 : 1;

        // if we have retries left, then resubmit the transaction
        if (!self.retryDroppedTxs || tx.payload.tries > self.TX_RETRY_MAX) {
          tx.status = "failed";
          tx.locked = false;
          if (isFunction(tx.onFailed)) {
            var e = clone(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
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
    if (tx.confirmations >= self.REQUIRED_CONFIRMATIONS) {
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
              if (self.debug.tx) console.log("loggedReturnValue:", err, log);
              if (err) {
                tx.payload.send = false;
                self.fire(tx.payload, function (callReturn) {
                  tx.locked = false;
                  if (isFunction(tx.onFailed)) {
                    if (err.error !== errors.NULL_CALL_RETURN.error) {
                      err.hash = tx.hash;
                      tx.onFailed(err);
                    } else {
                      var e = self.errorCodes(tx.payload.method, tx.payload.returns, callReturn);
                      e.hash = tx.hash;
                      tx.onFailed(e);
                    }
                  }
                });
              } else {
                var e = self.errorCodes(tx.payload.method, tx.payload.returns, log.returnValue);
                if (self.debug.tx) console.log("errorCodes:", e);
                if (e && e.error) {
                  e.gasFees = log.gasUsed.times(new BigNumber(onChainTx.gasPrice, 16)).dividedBy(self.ETHER).toFixed();
                  tx.locked = false;
                  if (isFunction(tx.onFailed)) {
                    e.hash = tx.hash;
                    tx.onFailed(e);
                  }
                } else {
                  onChainTx.callReturn = self.applyReturns(tx.payload.returns, log.returnValue);
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
    var self = this;
    if (!isFunction(callback)) {
      if (!payload || ((!payload.mutable && payload.returns !== "null") && (txHash === null || txHash === undefined))) {
        throw new this.Error(errors.TRANSACTION_FAILED);
      }
      if (this.txs[txHash]) throw new this.Error(errors.DUPLICATE_TRANSACTION);
      this.txs[txHash] = {
        hash: txHash,
        payload: payload,
        callReturn: callReturn,
        count: 0,
        status: "pending"
      };
      var tx = this.getTransaction(txHash);
      if (!tx) throw new this.Error(errors.TRANSACTION_FAILED);
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
    var self = this;
    payload.send = true;
    var returns = payload.returns;
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
    if (this.txs[tx.hash].count >= this.TX_POLL_MAX) {
      this.txs[tx.hash].status = "unconfirmed";
      if (!isFunction(callback)) {
        throw new Error(errors.TRANSACTION_NOT_CONFIRMED);
      }
      return callback(errors.TRANSACTION_NOT_CONFIRMED);
    }
    if (!isFunction(callback)) {
      wait(this.TX_POLL_INTERVAL);
      if (this.txs[tx.hash].status === "pending" || this.txs[tx.hash].status === "mined") {
        return null;
      }
    } else {
      var self = this;
      this.notifications[tx.hash] = setTimeout(function () {
        if (self.txs[tx.hash].status === "pending" || self.txs[tx.hash].status === "mined") {
          callback(null, null);
        }
      }, this.TX_POLL_INTERVAL);
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
    var self = this;
    if (!isFunction(callback)) {
      var receipt = this.getTransactionReceipt(txHash);
      if (!receipt || !receipt.logs || !receipt.logs.length) {
        throw new this.Error(errors.NULL_CALL_RETURN);
      }
      var log = receipt.logs[receipt.logs.length - 1];
      if (!log || log.data === null || log.data === undefined) {
        throw new this.Error(errors.NULL_CALL_RETURN);
      }
      return {
        returnValue: log.data,
        gasUsed: new BigNumber(receipt.gasUsed, 16)
      };
    }
    this.getTransactionReceipt(txHash, function (receipt) {
      if (self.debug.tx) console.log("got receipt:", receipt);
      if (!receipt || !receipt.logs || !receipt.logs.length) {
        return callback(errors.NULL_CALL_RETURN);
      }
      var log = receipt.logs[receipt.logs.length - 1];
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
    var self = this;
    if (!isFunction(callback)) {
      var tx = this.getTransaction(txHash);
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
    var self = this;
    if (!isFunction(callback)) {
      var tx = this.txNotify(txHash);
      if (tx === null) return null;
      var minedTx = this.checkBlockHash(tx, numConfirmations);
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
    var callReturn;
    if (payload.mutable || payload.returns === "null") {
      callReturn = null;
    } else {
      callReturn = this.fire(payload);
      if (this.debug.tx) console.log("callReturn:", callReturn);
      if (callReturn === undefined || callReturn === null) {
        throw new this.Error(errors.NULL_CALL_RETURN);
      } else if (callReturn.error === "0x") {
        callReturn = null;
      } else if (callReturn.error) {
        throw new this.Error(callReturn);
      }
    }
    payload.send = true;
    var returns = payload.returns;
    delete payload.returns;
    var txHash = (payload.invoke || this.invoke).call(this, payload);
    if (this.debug.tx) console.log("txHash:", txHash);
    if (!txHash && !payload.mutable && payload.returns !== "null") {
      throw new this.Error(errors.NULL_RESPONSE);
    } else if (txHash && txHash.error) {
      throw new this.Error(txHash);
    }
    payload.returns = returns;
    txHash = abi.format_int256(txHash);
    this.verifyTxSubmitted(payload, txHash, callReturn);
    var tx = this.pollForTxConfirmation(txHash, null);
    if (tx === null) {
      payload.tries = (payload.tries) ? payload.tries + 1 : 1;
      if (payload.tries > this.TX_RETRY_MAX) {
        throw new this.Error(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
      }
      return this.transact(payload);
    }
    tx.timestamp = parseInt(this.getBlock(tx.blockNumber, false).timestamp, 16);
    if (!payload.mutable) {
      tx.callReturn = callReturn;
      var receipt = this.getTransactionReceipt(txHash);
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
    var log = this.getLoggedReturnValue(txHash);
    var e = this.errorCodes(payload.method, payload.returns, log.returnValue);
    if (e && e.error) {
      e.gasFees = log.gasUsed.times(new BigNumber(tx.gasPrice, 16)).dividedBy(this.ETHER).toFixed();
      if (e.error !== errors.NULL_CALL_RETURN.error) {
        throw new Error(e);
      }
      callReturn = this.fire(payload);
      throw new Error(this.errorCodes(payload.method, payload.returns, callReturn));
    }
    tx.callReturn = this.applyReturns(payload.returns, log.returnValue);
    tx.gasFees = log.gasUsed.times(new BigNumber(tx.gasPrice, 16)).dividedBy(this.ETHER).toFixed();
    return tx;
  },

  transact: function (payload, onSent, onSuccess, onFailed) {
    var self = this;
    if (this.debug.tx) console.log("payload transact:", payload);
    payload.send = false;

    // synchronous / blocking transact sequence
    if (!isFunction(onSent)) return this.transactSync(payload);

    // asynchronous / non-blocking transact sequence
    var cb = (isFunction(this.txRelay)) ? {
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

function validateAndDefaultBlockNumber(blockNumber) {
  if (blockNumber === undefined) return "latest";
  if (blockNumber === null) return "latest";
  if (blockNumber === "latest") return blockNumber;
  if (blockNumber === "earliest") return blockNumber;
  if (blockNumber === "pending") return blockNumber;
  try {
    return validateNumber(blockNumber, "block");
  } catch (error) {
    throw new Error("block must be a number, a 0x prefixed hex string, or 'latest' or 'earliest' or 'pending'");
  }
}

function validateAddress(address) {
  if (address === null || address === undefined) throw new Error("address is required");
  if (typeof address !== "string") throw new Error("address must be a string but was " + typeof address);
  // fixup malformed addresses
  if (/^[0-9a-fA-F]*$/.test(address)) address = "0x" + address;
  if (!/^0x[0-9a-fA-F]*$/.test(address)) throw new Error("address can only contain 0-9 and a-Z and must start with 0x.  Provided: " + address);
  if (address.length !== 42) throw new Error("address must be 42 characters, 20 bytes (2 hex encoded code points each) plus the 0x prefix.  Length: " + address.length);
  return address;
}

function validateNumber(number, parameterName) {
  if (!parameterName) parameterName = "number";
  if (number === null) return number;
  if (number === undefined) return number;
  if (typeof number === "number") return "0x" + number.toString(16);
  if (typeof number === "string" && /^0x[0-9a-zA-Z]+$/.test(number)) return number;
  throw new Error(parameterName, " must be a number, null, undefined or a 0x prefixed hex encoded string");
}

function validateTransaction(transaction) {
  if (!transaction) throw new Error("transaction is required");
  transaction.from = validateAddress(transaction.from);
  if (transaction.to !== undefined && transaction.to !== null) transaction.to = validateAddress(transaction.to);
  transaction.gas = validateNumber(transaction.gas, "gas");
  transaction.gasPrice = validateNumber(transaction.gasPrice, "gasPrice");
  transaction.value = validateNumber(transaction.value, "value");
  if (transaction.data !== undefined && transaction.data !== null && typeof transaction.data !== "string") throw new Error("data must be a string");
  if (!/^0x[0-9a-zA-Z]*$/.test(transaction.data)) throw new Error("data must be a hex encoded string with a leader `0x`");
  transaction.nonce = validateNumber(transaction.nonce, "nonce");
  transaction.minBlock = validateAndDefaultBlockNumber(transaction.minBlock);
}

function ethereumEncodePrimitive(primitive) {
  if (typeof primitive === "undefined") return primitive;
  if (primitive === null) return primitive;
  if (typeof primitive === "boolean") return primitive;
  if (typeof primitive === "string") return primitive;
  if (typeof primitive === "number") return ethereumEncodeNumber(primitive);
  if (primitive instanceof Array) return ethereumEncodeArray(primitive);
  if (typeof primitive === "object") return ethereumEncodeObject(primitive);
  if (isFunction(primitive)) throw new Error("Cannot encode a function to be sent to Ethereum.");
  throw new Error("Attempted to encode an unsupported type.  typeof: " + typeof primitive);
}

function ethereumEncodeObject(object) {
  for (var property in object) {
    object[property] = ethereumEncodePrimitive(object[property]);
  }
  return object;
}

function ethereumEncodeArray(array) {
  if (!(array instanceof Array)) throw new Error("array must be an array.");
  for (var i = 0; i < array.length; ++i) {
    array[i] = ethereumEncodePrimitive(array[i]);
  }
  return array;
}

function ethereumEncodeNumber(number) {
  if (typeof number !== "number") throw new Error("number must be a number.");
  var numberAsHexString = number.toString(16);
  return "0x" + numberAsHexString;
}
