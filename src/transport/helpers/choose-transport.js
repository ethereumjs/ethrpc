"use strict";

var isNotNull = require("../../utils/is-not-null");

/**
 * Choose the transport for this request given the requirements.
 *
 * @param {!string} requirements - ANY, SYNC or DUPLEX.  Will choose best available transport that meets the requirements.
 * @returns {!AbstractTransport}
 */
function chooseTransport(internalState, requirements) {
  var eligibleTransports;
  switch (requirements) {
    case "ANY":
      eligibleTransports = [internalState.web3Transport, internalState.ipcTransport, internalState.wsTransport, internalState.httpTransport];
      break;
    case "SYNC":
      eligibleTransports = [internalState.syncTransport];
      break;
    case "DUPLEX":
      eligibleTransports = [internalState.ipcTransport, internalState.wsTransport];
      break;
    default:
      throw new Error("requirements must be one of ANY, SYNC or DUPLEX");
  }
  eligibleTransports = eligibleTransports.filter(isNotNull);
  if (eligibleTransports.length <= 0) {
    throw new Error("No transports available that meet the requirements (" + requirements + ").");
  }
  return eligibleTransports[0];
}

module.exports = chooseTransport;
