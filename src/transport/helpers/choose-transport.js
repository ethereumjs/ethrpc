"use strict";

var isNotNull = require("../../utils/is-not-null");

/**
 * Choose the transport for this request.
 * @returns {!AbstractTransport}
 */
function chooseTransport(internalState) {
  var eligibleTransports = [internalState.web3Transport, internalState.ipcTransport, internalState.wsTransport, internalState.httpTransport].filter(isNotNull);
  if (eligibleTransports.length === 0) throw new Error("No transports available");
  return eligibleTransports[0];
}

module.exports = chooseTransport;
