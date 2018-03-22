"use strict";

/**
 * Choose the transport for this request.
 * @returns {!AbstractTransport}
 */
function chooseTransport(internalState) {
  var eligibleTransport = internalState.transport;
  if (eligibleTransport == null) {
    throw new Error("No transports available");
  } else {
    return eligibleTransport;
  }
}

module.exports = chooseTransport;
