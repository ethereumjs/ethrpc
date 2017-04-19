"use strict";

var syncRequest = require("sync-request");

// hack to workaround https://github.com/ethereum/go-ethereum/issues/3762
module.exports = function (method, uri, options) {
  if (typeof location !== "undefined" && location.host) {
    options.uri = uri;
  }
  return syncRequest(method, uri, options);
};
