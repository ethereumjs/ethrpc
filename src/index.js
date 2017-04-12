/**
 * JSON RPC methods for Ethereum
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var clone = require("clone");
var BigNumber = require("bignumber.js");
var abi = require("augur-abi");

var getBlockAndLogStreamer = require("./block-management/get-block-and-log-streamer");

var packageAndSubmitRawTransaction = require("./raw-transactions/package-and-submit-raw-transaction");
var packageAndSignRawTransaction = require("./raw-transactions/package-and-sign-raw-transaction");
var packageRawTransaction = require("./raw-transactions/package-raw-transaction");
var signRawTransaction = require("./raw-transactions/sign-raw-transaction");

var packageRequest = require("./encode-request/package-request");

var handleRPCError = require("./decode-response/handle-rpc-error");
var convertResponseToReturnsType = require("./decode-response/convert-response-to-returns-type");

var validateAndDefaultBlockNumber = require("./validate/validate-and-default-block-number");
var validateTransaction = require("./validate/validate-transaction");

var registerTransactionRelay = require("./transaction-relay/register-transaction-relay");
var unregisterTransactionRelay = require("./transaction-relay/unregister-transaction-relay");
var excludeFromTransactionRelay = require("./transaction-relay/exclude-from-transaction-relay");
var includeInTransactionRelay = require("./transaction-relay/include-in-transaction-relay");

var connect = require("./connect");
var resetState = require("./reset-state");

var raw = require("./wrappers/raw");
var eth_ = require("./wrappers/eth");
var net_ = require("./wrappers/net");

var web3_ = require("./wrappers/web3");
var clientVersion = require("./wrappers/web3/client-version");

var txpool_ = require("./wrappers/txpool");
var shh_ = require("./wrappers/shh");
var admin_ = require("./wrappers/admin");
var personal_ = require("./wrappers/personal");

var isFunction = require("./utils/is-function");
var wait = require("./utils/wait");
var noop = require("./utils/noop");
var sha3 = require("./utils/sha3");

var ErrorWithData = require("./errors").ErrorWithData;
var RPCError = require("./errors/rpc-error");
var errors = require("./errors/codes");

var store = require("./store");
var constants = require("./constants");

BigNumber.config({
  MODULO_MODE: BigNumber.EUCLID,
  ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN
});

module.exports = {

  store: store,
  errors: errors,

  // Hook for transaction callbacks
  // txRelay: null,

  // Do not call txRelay for these methods
  // excludedFromTxRelay: null,

  // txs: null,
  // rawTxMaxNonce: null,
  // block: null,
  // networkID: null,

  // notifications: null,

  // configuration: null,
  // internalState: null,

  packageAndSubmitRawTransaction: packageAndSubmitRawTransaction,
  packageAndSignRawTransaction: packageAndSignRawTransaction,
  signRawTransaction: signRawTransaction,
  packageRawTransaction: packageRawTransaction,
  packageRequest: packageRequest,

  connect: function (configuration, initialConnectCallback) {
    return store.dispatch(connect(configuration, initialConnectCallback));
  },

  getBlockAndLogStreamer: function () {
    return store.dispatch(getBlockAndLogStreamer());
  },

  registerTransactionRelay: function () {
    return store.dispatch(registerTransactionRelay());
  },
  unregisterTransactionRelay: function () {
    return store.dispatch(unregisterTransactionRelay());
  },
  excludeFromTransactionRelay: function (method) {
    return store.dispatch(excludeFromTransactionRelay(method));
  },
  includeInTransactionRelay: function (method) {
    return store.dispatch(includeInTransactionRelay(method));
  },

  // delete cached network, notification, and transaction data
  clear: function () {
    store.dispatch({ type: "CLEAR_ALL_NOTIFICATIONS" });
    store.dispatch({ type: "REMOVE_ALL_TRANSACTIONS" });
    store.dispatch({ type: "RESET_HIGHEST_NONCE" });
  },

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
  getGasPrice: function (callback) { return this.gasPrice(null, callback); },
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
    var block;
    if (shouldReturnFullTransactions !== true) shouldReturnFullTransactions = false;
    block = validateAndDefaultBlockNumber(number);
    return store.dispatch(wrappers.eth.getBlockByNumber([block, Boolean(shouldReturnFullTransactions)], callback));
  },
  getBlock: function (number, shouldReturnFullTransactions, callback) {
    return this.getBlockByNumber(number, shouldReturnFullTransactions, callback);
  },
  getCode: function (address, blockNumber, callback) {
    return store.dispatch(wrappers.eth.getCode([address, validateAndDefaultBlockNumber(blockNumber)], callback));
  },
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
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return store.dispatch(wrappers.eth.getUncleByBlockNumberAndIndex([blockNumber, index], callback));
  },
  getUncle: function (blockNumber, index, callback) {
    return this.getUncleByBlockNumberAndIndex(blockNumber, index, callback);
  },
  getUncleCountByBlockHash: function (blockHash, callback) {
    return store.dispatch(wrappers.eth.getUncleCountByBlockHash([blockHash], callback));
  },
  getUncleCountByBlockNumber: function (blockNumber, callback) {
    blockNumber = validateAndDefaultBlockNumber(blockNumber);
    return store.dispatch(wrappers.eth.getUncleCountByBlockNumber([blockNumber], callback));
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
    return store.dispatch(wrappers.eth.sendTransaction([address, data], callback));
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
  syncing: function (callback) { return store.dispatch(wrappers.eth.sendTransaction(null, callback)); },
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
    invocation = (payload.send) ? this.sendTransaction : this.call;
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
      store.dispatch({
        type: "UPDATE_TRANSACTION",
        hash: tx.hash,
        key: "tx",
        value: onChainTx
      });
      // tx.tx = abi.copy(onChainTx);

      // if transaction is null, then it was dropped from the txpool
      if (onChainTx === null) {
        store.dispatch({ type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES", hash: tx.hash });
        // tx.payload.tries = (tx.payload.tries) ? tx.payload.tries + 1 : 1;

        // if we have retries left, then resubmit the transaction
        if (tx.payload.tries > constants.TX_RETRY_MAX) {
          store.dispatch({ type: "TRANSACTION_FAILED", hash: tx.hash });
          // tx.status = "failed";
          store.dispatch({ type: "UNLOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = false;
          if (isFunction(tx.onFailed)) {
            e = clone(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
            e.hash = tx.hash;
            tx.onFailed(e);
          }
        } else {
          store.dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
          // --self.rawTxMaxNonce;
          store.dispatch({ type: "TRANSACTION_RESUBMITTED", hash: tx.hash });
          // tx.status = "resubmitted";
          store.dispatch({ type: "UNLOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = false;
          if (self.debug.tx) console.log("resubmitting tx:", tx.hash);
          self.transact(tx.payload, tx.onSent, tx.onSuccess, tx.onFailed);
        }

        // non-null transaction: transaction still alive and kicking!
        // check if it has been mined yet (block number is non-null)
      } else {
        if (onChainTx.blockNumber) {
          store.dispatch({
            type: "UPDATE_TRANSACTION_BLOCK",
            hash: tx.hash,
            blockNumber: parseInt(onChainTx.blockNumber, 16),
            blockHash: onChainTx.blockHash
          });
          // tx.tx.blockNumber = parseInt(onChainTx.blockNumber, 16);
          // tx.tx.blockHash = onChainTx.blockHash;
          store.dispatch({ type: "TRANSACTION_MINED", hash: tx.hash });
          // tx.status = "mined";
          store.dispatch({
            type: "SET_TRANSACTION_CONFIRMATIONS",
            hash: tx.hash,
            currentBlockNumber: store.getState().currentBlock.number
          });
          // tx.confirmations = self.block.number - tx.tx.blockNumber;
          self.updateMinedTx(tx);
        } else {
          store.dispatch({ type: "UNLOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = false;
        }
      }
    });
  },

  updateMinedTx: function (tx) {
    var self = this;
    var onChainTx = tx.tx;
    store.dispatch({
      type: "SET_TRANSACTION_CONFIRMATIONS",
      hash: tx.hash,
      currentBlockNumber: store.getState().currentBlock.number
    });
    // tx.confirmations = self.block.number - onChainTx.blockNumber;
    if (self.debug.tx) console.log("confirmations for", tx.hash, tx.confirmations);
    if (tx.confirmations >= constants.REQUIRED_CONFIRMATIONS) {
      store.dispatch({ type: "TRANSACTION_CONFIRMED", hash: tx.hash });
      // tx.status = "confirmed";
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
    var state, storedTransaction, tx, self = this;
    state = store.getState();
    storedTransaction = state.transactions[txHash];
    if (!isFunction(callback)) {
      if (!payload || ((!payload.mutable && payload.returns !== "null") && (txHash === null || txHash === undefined))) {
        throw new RPCError(errors.TRANSACTION_FAILED);
      }
      if (storedTransaction) throw new RPCError(errors.DUPLICATE_TRANSACTION);
      store.dispatch({
        type: "ADD_TRANSACTION",
        hash: txHash,
        transaction: {
          hash: txHash,
          payload: payload,
          callReturn: callReturn,
          count: 0,
          status: "pending"
        }
      });
      // this.txs[txHash] = {
      //   hash: txHash,
      //   payload: payload,
      //   callReturn: callReturn,
      //   count: 0,
      //   status: "pending"
      // };
      tx = this.getTransaction(txHash);
      if (!tx) throw new RPCError(errors.TRANSACTION_FAILED);
      // this.txs[txHash].tx = tx;
      store.dispatch({
        type: "UPDATE_TRANSACTION",
        hash: txHash,
        key: "tx",
        value: tx
      });
      return;
    }
    if (!payload || txHash === null || txHash === undefined) {
      return callback(errors.TRANSACTION_FAILED);
    }
    if (storedTransaction) return callback(errors.DUPLICATE_TRANSACTION);
    store.dispatch({
      type: "ADD_TRANSACTION",
      transaction: {
        hash: txHash,
        payload: payload,
        callReturn: callReturn,
        onSent: onSent,
        onSuccess: onSuccess,
        onFailed: onFailed,
        count: 0,
        status: "pending"
      }
    });
    // this.txs[txHash] = {
    //   hash: txHash,
    //   payload: payload,
    //   callReturn: callReturn,
    //   onSent: onSent,
    //   onSuccess: onSuccess,
    //   onFailed: onFailed,
    //   count: 0,
    //   status: "pending"
    // };
    if (state.currentBlock && state.currentBlock.number) {
      this.updateTx(storedTransaction);
      return callback(null);
    }
    this.blockNumber(function (blockNumber) {
      if (!blockNumber || blockNumber.error) {
        return callback(blockNumber || "rpc.blockNumber lookup failed");
      }
      // self.block = { number: parseInt(blockNumber, 16) };
      store.dispatch({
        type: "SET_CURRENT_BLOCK",
        block: { number: parseInt(blockNumber, 16) }
      });
      self.updateTx(storedTransaction);
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
    var storedTransaction = store.getState().transactions[tx.hash];
    if (storedTransaction.count >= constants.TX_POLL_MAX) {
      storedTransaction.status = "unconfirmed";
      if (!isFunction(callback)) {
        throw new RPCError(errors.TRANSACTION_NOT_CONFIRMED);
      }
      return callback(errors.TRANSACTION_NOT_CONFIRMED);
    }
    if (!isFunction(callback)) {
      wait(constants.TX_POLL_INTERVAL);
      if (storedTransaction.status === "pending" || storedTransaction.status === "mined") {
        return null;
      }
    } else {
      store.dispatch({
        type: "ADD_NOTIFICATION",
        hash: tx.hash,
        notification: setTimeout(function () {
          if (storedTransaction.status === "pending" || storedTransaction.status === "mined") {
            callback(null, null);
          }
        }, constants.TX_POLL_INTERVAL)
      });
      // this.notifications[tx.hash] = setTimeout(function () {
      //   if (storedTransaction.status === "pending" || storedTransaction.status === "mined") {
      //     callback(null, null);
      //   }
      // }, constants.TX_POLL_INTERVAL);
    }
  },

  completeTx: function (tx, callback) {
    store.dispatch({
      type: "UPDATE_TRANSACTION",
      hash: tx.hash,
      key: "status",
      value: "confirmed"
    });
    // this.txs[tx.hash].status = "confirmed";
    store.dispatch({ type: "CLEAR_NOTIFICATION", hash: tx.hash });
    // clearTimeout(this.notifications[tx.hash]);
    // delete this.notifications[tx.hash];
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
    var storedTransaction = clone(store.getState().transactions[tx.hash]);
    if (!storedTransaction) storedTransaction = {};
    // if (!this.txs[tx.hash]) this.txs[tx.hash] = {};
    store.dispatch({
      type: "INCREMENT_TRANSACTION_COUNT",
      hash: tx.hash
    });
    // if (storedTransaction.count === undefined) storedTransaction.count = 0;
    // ++storedTransaction.count;
    if (this.debug.tx) console.log("checkBlockHash:", tx.blockHash);
    if (tx && tx.blockHash && parseInt(tx.blockHash, 16) !== 0) {
      tx.txHash = tx.hash;
      if (!numConfirmations) {
        store.dispatch({
          type: "UPDATE_TRANSACTION",
          hash: tx.hash,
          key: "status",
          value: "mined"
        });
        // storedTransaction.status = "mined";
        store.dispatch({
          type: "CLEAR_NOTIFICATION",
          hash: tx.hash
        });
        // clearTimeout(this.notifications[tx.hash]);
        // delete this.notifications[tx.hash];
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
