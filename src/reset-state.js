"use strict";

var blockchainMessageHandler = require("./rpc/blockchain-message-handler");
var removeAllStoreListeners = require("./subscriptions/store-observer").removeAllStoreListeners;
var clearTransactions = require("./clear-transactions");
var isObject = require("./utils/is-object");
var internalState = require("./internal-state");

function resetState() {
  return function (dispatch, getState) {
    var messageHandlerObject, blockNotifier, notifications, debug = getState().debug;
    dispatch(clearTransactions());

    // stop any pending timers
    clearInterval(internalState.get("newBlockIntervalTimeoutId"));

    // destroy the old BlockNotifier so it doesn't try to reconnect or continue polling
    blockNotifier = internalState.get("blockNotifier");
    if (blockNotifier && blockNotifier.destroy) blockNotifier.destroy();

    notifications = internalState.get("notifications");
    if (isObject(notifications)) {
      Object.keys(notifications).map(function (hash) {
        if (notifications[hash]) clearTimeout(notifications[hash]);
      });
    }

    removeAllStoreListeners();

    // redirect any not-yet-received responses to /dev/null
    internalState.set("shimMessageHandlerObject.realMessageHandler", function () { return dispatch({ type: "DEV_NULL" }); });
    messageHandlerObject = { realMessageHandler: blockchainMessageHandler };

    // reset state to defaults
    internalState.setState({
      transporter: null,
      blockNotifier: null,
      blockAndLogStreamer: null,
      outstandingRequests: {},
      subscriptions: {},
      newBlockIntervalTimeoutId: null,
      outOfBandErrorHandler: null,
      shimMessageHandlerObject: messageHandlerObject,
      // by binding this function to `shimMessageHandlerObject`, its `this` value will
      // be a pointer to an object that we can mutate before replacing when reset
      shimMessageHandler: function (error, jso) {
        dispatch(this.realMessageHandler(error, jso));
      }.bind(messageHandlerObject)
    });

    // reset state to defaults
    dispatch({ type: "RESET_STATE" });

    // restore debugging options
    dispatch({ type: "SET_DEBUG_OPTIONS", options: debug });
  };
}

module.exports = resetState;
