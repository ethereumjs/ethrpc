"use strict";

/**
 * Constructs an AbstractTransporter.  Should not be called directly, used by derived prototypes.
 * 
 * @param {!string} address
 * @param {!number} timeout
 * @param {function(?Error, !object):void} messageHandler
 */
function AbstractTransport(address, timeout, messageHandler) {
  if (typeof address !== "string") throw new Error("address must be a string");
  if (typeof timeout !== "number") throw new Error("timeout must be a number");
  if (typeof messageHandler !== "function") throw new Error("messageHandler must be a function");
  
  this.address = address;
  this.timeout = timeout;
  this.messageHandler = messageHandler;
  this.workQueue = [];

  this.awaitingPump = false;
  this.connected = false;
  this.backoffMilliseconds = 1;
  this.reconnectListeners = {};
}

/**
 * Submits work to be processed by this transport.
 * 
 * @param {!object} rpcObject - The JSON-RPC payload you want to send, in object form
 */
AbstractTransport.prototype.submitWork = function (rpcObject) {
  if (typeof rpcObject !== "object") throw new Error("rpcObject must be an object");

  this.workQueue.push(rpcObject);
  // if we aren't connected, the queue will be auto-pumped once we are
  if (!this.connected) return;
  // if we already have a pump queued up, then we can just get in with that batch
  if (this.awaitingPump) return;
  // force into an async context so behavior doesn't differ depending on whether or not this is first-in-queue
  this.awaitingPump = true;
  setTimeout(pumpQueue.bind(this));
}

/**
 * Register to be notified when a reconnect occurs for this transport.
 * 
 * @param {function():void} callback - called when this transport reconnects (possibly never)
 */
AbstractTransport.prototype.addReconnectListener = function (callback) {
  this.reconnectListeners[callback] = callback;
}

/**
 * Unregister a previously registered reconnect listener.
 * 
 * @param {function():void} callbackToRemove - the callback you want to un-register from this transport
 */
AbstractTransport.prototype.removeReconnectListener = function (callbackToRemove) {
  delete this.reconnectListeners[callbackToRemove];
}

/**
 * Used internally by derived prototypes to attempt to establish an initial connection.  Should be called from constructor.
 * 
 * @param {function(?Error, ?this):void} callback - Called when connect is complete (success or failure)
 */
AbstractTransport.prototype.initialConnect = function (callback) {
  this.connect(function (error) {
    if (error !== null) return callback(error);

    this.connected = true;
    pumpQueue.bind(this)();
    callback(null, this);
  }.bind(this));
}

/**
 * Implemented by derived prototypes.  Should submit the given object to Ethereum.
 * 
 * @param {!object} rpcJso - RPC Object to be sent to Ethereum.
 * @param {!function(!Error):void} errorCallback - To be called if something goes wrong with the connection.  If the provided error has retryable = true property then the request will be re-queued and connection will be re-established.
 */
AbstractTransport.prototype.submitRpcRequest = function (rpcJso, errorCallback) {
  callback(new Error("Must be implemented by derived prototype."));
}

/**
 * Implemented by derived prototypes.  Should establish a connection or otherwise validate that the remote host is accessible.
 * 
 * @param {!function(?Error):void} callback - Called when connected, or upon failing to connect.
 */
AbstractTransport.prototype.connect = function (callback) {
  callback(new Error("Must be implemented by derived prototype."));
}

/**
 * Used internally to pump the current work queue.
 */
function pumpQueue() {
  this.awaitingPump = false;
  var rpcObject;
  while (rpcObject = this.workQueue.shift()) {
    // it is possible to lose a connection while iterating over the queue, if that happens unroll the latest iteration and stop pumping (reconnect will start pumping again)
    if (!this.connected) {
      this.workQueue.unshift(rpcObject);
      return;
    };
    processWork.bind(this)(rpcObject);
  }
}

/**
 * Processes one request off the head of the queue.
 */
function processWork(rpcObject) {
  this.submitRpcRequest(rpcObject, function (error) {
    if (error === null) return;
    if (error.retryable) {
      // if the error is retryable, put it back on the queue (at the head) and initiate reconnection in the background
      this.workQueue.unshift(rpcObject);
      // if this is the first retriable failure then initiate a reconnect
      if (this.connected) {
        this.connected = false;
        reconnect.bind(this)();
      }
    }
    else {
      // if we aren't going to retry the request, let the user know that something went wrong so they can handle it
      error.data = rpcObject;
      this.messageHandler(error);
    }
  }.bind(this));
}

/**
 * Attempts to reconnect with exponential backoff.
 */
function reconnect() {
  this.connect(function (error) {
    if (error !== null) return setTimeout(reconnect.bind(this), this.backoffMilliseconds *= 2);
    Object.keys(this.reconnectListeners).forEach(function (key) {
      if (typeof this.reconnectListeners[key] !== "function") return delete this.reconnectListeners[key];
      this.reconnectListeners[key]();
    }.bind(this));
    this.connected = true;
    this.backoffMilliseconds = 1;
    pumpQueue.bind(this)();
  }.bind(this));
}

module.exports = AbstractTransport;
