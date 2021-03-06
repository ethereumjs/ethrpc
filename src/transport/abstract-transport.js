"use strict";

/**
 * Constructs an AbstractTransporter.  Should not be called directly, used by derived prototypes.
 *
 * @param {!string} address
 * @param {!number} timeout
 * @param {function(?Error, !object):void} messageHandler
 */
function AbstractTransport(address, timeout, maxRetries, messageHandler) {
  if (typeof address !== "string") {
    throw new Error("address must be a string");
  }
  if (typeof timeout !== "number") {
    throw new Error("timeout must be a number");
  }
  if (typeof messageHandler !== "function") {
    throw new Error("messageHandler must be a function");
  }

  this.address = address;
  this.timeout = timeout;
  this.maxRetries = maxRetries || 0;
  this.messageHandler = messageHandler;
  this.workQueue = [];

  this.awaitingPump = false;
  this.didInitialConnect = false;
  this.connected = false;
  this.backoffMilliseconds = 1;
  this.nextListenerToken = 1;
  this.reconnectListeners = {};
  this.disconnectListeners = {};

  return this;
}

/**
 * Pumps the current work queue.
 */
function pumpQueue(abstractTransport) {
  var rpcObject;
  abstractTransport.awaitingPump = false;
  while ((rpcObject = abstractTransport.workQueue.shift())) {
    // it is possible to lose a connection while iterating over the queue,
    // if that happens unroll the latest iteration and stop pumping
    // (reconnect will start pumping again)
    if (!abstractTransport.connected) {
      abstractTransport.workQueue.unshift(rpcObject);
      return;
    }
    processWork(abstractTransport, rpcObject);
  }
}

/**
 * Register to be notified when a disconnect occurs for this transport.
 *
 * @param {function():void} callback - called when this transport disconnects (possibly never)
 */
AbstractTransport.prototype.addDisconnectListener = function (callback) {
  var token = (this.nextListenerToken++).toString();
  this.disconnectListeners[token] = callback;
  return token;
};

/**
 * Unregister a previously registered disconnect listener.
 *
 * @param {function():void} callbackToRemove - the callback you want to un-register from this transport
 */
AbstractTransport.prototype.removeDisconnectListener = function (token) {
  delete this.disconnectListeners[token];
};

/**
 * Register to be notified when a reconnect occurs for this transport.
 *
 * @param {function():void} callback - called when this transport reconnects (possibly never)
 */
AbstractTransport.prototype.addReconnectListener = function (callback) {
  var token = (this.nextListenerToken++).toString();
  this.reconnectListeners[token] = callback;
  return token;
};

/**
 * Unregister a previously registered reconnect listener.
 *
 * @param {function():void} callbackToRemove - the callback you want to un-register from this transport
 */
AbstractTransport.prototype.removeReconnectListener = function (token) {
  delete this.reconnectListeners[token];
};

/**
 * Used internally by derived prototypes to attempt to establish an initial connection.  Should be called from constructor.
 *
 * @param {function(?Error, ?this):void} callback - Called when connect is complete (success or failure)
 */
AbstractTransport.prototype.initialConnect = function (callback) {
  this.connect(function (error) {
    if (error !== null) return callback(error);

    this.didInitialConnect = true;
    this.connected = true;
    pumpQueue(this);
    callback(null, this);
  }.bind(this));
};

/**
 * Used to close and cleanup the connection a transporter instance wraps.. Probably only interested when working with WebSockets.
 */
AbstractTransport.prototype.close = function () {};


/**
 * Implemented by derived prototypes.  Should submit the given object to Ethereum.
 *
 * @param {!object} rpcJso - RPC Object to be sent to Ethereum.
 * @param {!function(!Error):void} errorCallback - To be called if something goes wrong with the connection.  If the provided error has retryable = true property then the request will be re-queued and connection will be re-established.
 */
AbstractTransport.prototype.submitRpcRequest = function (rpcJso, errorCallback) {
  errorCallback(new Error("Must be implemented by derived prototype."));
};

/**
 * Implemented by derived prototypes.  Should establish a connection or otherwise validate that the remote host is accessible.
 *
 * @param {!function(?Error):void} callback - Called when connected, or upon failing to connect.
 */
AbstractTransport.prototype.connect = function (callback) {
  callback(new Error("Must be implemented by derived prototype."));
};

AbstractTransport.prototype.getTransportName = function () {
  return "AbstractTransport";
};

AbstractTransport.prototype.resetState = function () {
  this.workQueue = [];
  this.awaitingPump = false;
  this.didInitialConnect = false;
  this.connected = false;
  this.backoffMilliseconds = 1;
  this.nextListenerToken = 1;
  this.reconnectListeners = {};
  this.disconnectListeners = {};
};

/**
 * Notify all reconnect listeners of a reconnect
 *
 */
function notifyReconnectListeners(abstractTransport) {
  Object.keys(abstractTransport.reconnectListeners).forEach(function (key) {
    if (typeof abstractTransport.reconnectListeners[key] !== "function") {
      delete abstractTransport.reconnectListeners[key];
    } else {
      abstractTransport.reconnectListeners[key]();
    }
  });
}

/**
 * Attempts to reconnect with exponential backoff.
 */
function reconnect(abstractTransport) {
  abstractTransport.connect(function (error) {
    if (error !== null) {
      setTimeout(reconnect.bind(this, abstractTransport), abstractTransport.backoffMilliseconds *= 2);
    } else {
      notifyReconnectListeners(abstractTransport);
      abstractTransport.connected = true;
      abstractTransport.backoffMilliseconds = 1;
      pumpQueue(abstractTransport);
    }
  });
}

/**
 * Notify all disconnect listeners of a disconnect
 *
 */
function notifyDisconnectListeners(abstractTransport, error) {
  Object.keys(abstractTransport.disconnectListeners).forEach(function (key) {
    if (typeof abstractTransport.disconnectListeners[key] !== "function") {
      delete abstractTransport.disconnectListeners[key];
    } else {
      abstractTransport.disconnectListeners[key](error);
    }
  });
}

/**
 * Submits work to be processed by this transport.
 *
 * @param {!object} rpcObject - The JSON-RPC payload you want to send, in object form
 */
AbstractTransport.prototype.submitWork = function (rpcObject) {
  if (typeof rpcObject !== "object") {
    throw new Error("rpcObject must be an object");
  }

  this.workQueue.push(rpcObject);

  // if we aren't connected, the queue will be auto-pumped once we are
  if (!this.connected) return;

  // if we already have a pump queued up, then we can just get in with that batch
  if (this.awaitingPump) return;

  // force into an async context so behavior doesn't differ depending on whether or not this is first-in-queue
  this.awaitingPump = true;
  setTimeout(pumpQueue.bind(null, this));
};

/**
 * Processes one request off the head of the queue.
 */
function processWork(abstractTransport, rpcObject) {
  abstractTransport.submitRpcRequest(rpcObject, function (error) {
    // NB this error callback not always executed on error if transport
    // is WsTransport, because WsTransport.submitRpcRequest() only
    // calls this callback for errors that can be detected prior to
    // sending messsage, not for errors receive from ethrpc server.
    if (error === null) return;
    if (error.retryable) {
      // if the error is retryable, put it back on the queue (at the head) and
      // initiate reconnection in the background
      abstractTransport.workQueue.unshift(rpcObject);
      // if this is the first retriable failure then initiate a reconnect
      if (abstractTransport.connected
        && !error.skipReconnect) { // skipReconnect indicates that this retryable error doesn't want the transport to be disconnected/reconnected, eg. because downstream consumers might interpret the disconnect as being related to a non-retryable issue.
        abstractTransport.connected = false;
        notifyDisconnectListeners(abstractTransport, error);
        reconnect(abstractTransport);
      } else {
        if (abstractTransport.awaitingPump) return;
        abstractTransport.awaitingPump = true;
        setTimeout(pumpQueue.bind(null, abstractTransport));
      }
    } else {
      // if we aren't going to retry the request, let the user know that
      // something went wrong so they can handle it
      error.data = rpcObject;
      notifyDisconnectListeners(abstractTransport, error);
      abstractTransport.messageHandler(error);
    }
  });
}

module.exports = AbstractTransport;
