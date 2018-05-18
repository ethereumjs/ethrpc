"use strict";

var BigNumber = require("bignumber.js");

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID, ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN });

module.exports = {

  ACCOUNT_TYPES: {
    U_PORT: "uPort",
    LEDGER: "ledger",
    PRIVATE_KEY: "privateKey",
    UNLOCKED_ETHEREUM_NODE: "unlockedEthereumNode",
    META_MASK: "metaMask",
    TREZOR: "trezor",
  },

  // Number of required confirmations for transact sequence
  REQUIRED_CONFIRMATIONS: 0,

  // Maximum number of retry attempts for dropped transactions
  TX_RETRY_MAX: 5,

  // Maximum number of transaction verification attempts
  TX_POLL_MAX: 1000,

  // Transaction polling interval
  TX_POLL_INTERVAL: 10000,

  // how frequently to poll when waiting for blocks
  BLOCK_POLL_INTERVAL: 30000,

  GAS_ESTIMATE_MULTIPLIER: new BigNumber("1.25", 10), // TODO adjust this empirically

  DEFAULT_ETH_CALL_GAS: "0x5d1420",

  ETHER: new BigNumber(10, 10).exponentiatedBy(18),

};
