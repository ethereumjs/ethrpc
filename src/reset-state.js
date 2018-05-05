"use strict";

var blockchainMessageHandler = require("./rpc/blockchain-message-handler");
var storeObservers = require("./store-observers");
var clearTransactions = require("./clear-transactions");
var isObject = require("./utils/is-object");
var internalState = require("./internal-state");
var unsubscribeFromNewBlockNotifications = require("./block-management/unsubscribe-from-new-block-notifications");
var stopPollingForBlocks = require("./block-management/stop-polling-for-blocks");

function resetState() {
  return function (dispatch, getState) {
    dispatch(clearTransactions());

    if (getState().newHeadsSubscription.id != null) dispatch(unsubscribeFromNewBlockNotifications());
    if (getState().newBlockPollingInterval != null) dispatch(stopPollingForBlocks());

    var notifications = internalState.get("notifications");
    if (isObject(notifications)) {
      Object.keys(notifications).map(function (hash) {
        if (notifications[hash]) clearTimeout(notifications[hash]);
      });
    }

    dispatch(storeObservers.removeAll());

    // redirect any not-yet-received responses to /dev/null
    internalState.set("shimMessageHandlerObject.realMessageHandler", function () { return dispatch({ type: "DEV_NULL" }); });
    var transporter = internalState.get("transporter");
    if (transporter != null) transporter.resetState();

    var messageHandlerObject = { realMessageHandler: blockchainMessageHandler };

    // reset state to defaults
    internalState.setState({
      transporter: null,
      blockAndLogStreamer: null,
      outstandingRequests: {},
      subscriptions: {},
      outOfBandErrorHandler: null,
      shimMessageHandlerObject: messageHandlerObject,
      // by binding this function to `shimMessageHandlerObject`, its `this` value will
      // be a pointer to an object that we can mutate before replacing when reset
      shimMessageHandler: function (error, jso) {
        dispatch(this.realMessageHandler(error, jso));
      }.bind(messageHandlerObject),
    });

    // reset redux store to initial state
    dispatch({ type: "RESET_STATE" });

    // restore debugging options
    dispatch({ type: "SET_DEBUG_OPTIONS", options: getState().debug });
  };
}

module.exports = resetState;
