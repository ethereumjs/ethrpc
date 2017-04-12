"use strict";

var makeWrapper = require("./make-wrapper");

module.exports = {
  content: makeWrapper("txpool_content"),
  inspect: makeWrapper("txpool_inspect"),
  status: makeWrapper("txpool_status")
};
