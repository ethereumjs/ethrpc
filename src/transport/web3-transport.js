"use strict";

var AbstractTransport = require("./abstract-transport.js");
var isGlobalWeb3 = require("../utils/is-global-web3");

function Web3Transport(messageHandler, initialConnectCallback) {
  this.abstractTransport = AbstractTransport.call(this, "web3", -1, 0, messageHandler);
  this.initialConnect(initialConnectCallback);
}

Web3Transport.prototype = Object.create(AbstractTransport.prototype);

Web3Transport.prototype.constructor = Web3Transport;

Web3Transport.prototype.connect = function (callback) {
  if (isGlobalWeb3()) {
    setTimeout(function () { callback(null); }, 1);
  } else {
    setTimeout(function () { callback(new Error("Nothing found at window.web3.currentProvider.")); }, 1);
  }
};

Web3Transport.prototype.getTransportName = function () {
  return "Web3Transport";
};

Web3Transport.prototype.close = function () {
  this.abstractTransport.connected = false;
};

Web3Transport.prototype.submitRpcRequest = function (rpcObject, errorCallback) {
  var web3Provider;
  if (typeof window === "undefined") return errorCallback("attempted to access 'window' outside of a browser, this shouldn't happen");
  web3Provider = (window || {}).ethereum;
  if (!web3Provider) web3Provider = ((window || {}).web3 || {}).currentProvider;
  if (!web3Provider) return errorCallback("window.ethereum and window.web3.currentProvider are not available.");
  web3Provider.sendAsync(rpcObject, this.messageHandler.bind(this));
};

module.exports = Web3Transport;
