"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var rpc = require("../src");
var errors = require("../src/errors.json");
var abi = require("augur-abi");
var EthTx = require("ethereumjs-tx");

describe("handleRawTransactionError", function () {
  var test = function (t) {
    it(t.description, function () {
      rpc.resetState();
      rpc.rawTxMaxNonce = t.state.rawTxMaxNonce;
      var output = rpc.handleRawTransactionError(t.params.rawTransactionResponse);
      t.assertions(output, rpc.rawTxMaxNonce);
    });
  };
  test({
    description: "Regular error message",
    params: {
      rawTransactionResponse: {message: "0xdeadbeef"}
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (output, rawTxMaxNonce) {
      assert.deepEqual(output, {message: "0xdeadbeef"});
      assert.strictEqual(rawTxMaxNonce, 7);
    }
  });
  test({
    description: "RLP encoding error message",
    params: {
      rawTransactionResponse: {message: "rlp encoding error"}
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (output, rawTxMaxNonce) {
      assert.deepEqual(output, {
        error: 504,
        message: "RLP encoding error"
      });
      assert.strictEqual(rawTxMaxNonce, 7);
    }
  });
  test({
    description: "Nonce too low error message",
    params: {
      rawTransactionResponse: {message: "Nonce too low"}
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (output, rawTxMaxNonce) {
      assert.isNull(output);
      assert.strictEqual(rawTxMaxNonce, 8);
    }
  });
});

describe("signRawTransaction", function () {
  var test = function (t) {
    it(t.description, function () {
      rpc.resetState();
      t.assertions(rpc.signRawTransaction(t.params.packaged, t.params.privateKey));
    });
  };
  test({
    description: "Sign packaged raw transaction",
    params: {
      packaged: {
        from: abi.format_address("0xb0b"),
        to: abi.format_address("0xd00d"),
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        nonce: 0,
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800"
      },
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    assertions: function (signedRawTransaction) {
      assert.deepEqual(signedRawTransaction, "f8aa808504a817c800832fd61894000000000000000000000000000000000000d00d80b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a11ba0ccd0945031f9bf92ea19c03bdcdbb87663143e00b91387ce987f0abc1d72c9c6a06250f610402e2d1a0c34174a8d606345c80515451cfb21567b911fd77eabfa31");
    }
  });
});

describe("verifyRawTransactionNonce", function () {
  var test = function (t) {
    it(t.description, function () {
      rpc.resetState();
      rpc.rawTxMaxNonce = t.state.rawTxMaxNonce;
      var nonce = rpc.verifyRawTransactionNonce(t.params.nonce);
      t.assertions(nonce, rpc.rawTxMaxNonce);
    });
  };
  test({
    description: "Nonce greater than rawTxMaxNonce",
    params: {
      nonce: 7
    },
    state: {
      rawTxMaxNonce: -1
    },
    assertions: function (nonce, rawTxMaxNonce) {
      assert.strictEqual(nonce, "0x7");
      assert.strictEqual(rawTxMaxNonce, 7);
    }
  });
  test({
    description: "Nonce equal to rawTxMaxNonce",
    params: {
      nonce: 7
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (nonce, rawTxMaxNonce) {
      assert.strictEqual(nonce, "0x8");
      assert.strictEqual(rawTxMaxNonce, 8);
    }
  });
  test({
    description: "Nonce less than rawTxMaxNonce",
    params: {
      nonce: 7
    },
    state: {
      rawTxMaxNonce: 8
    },
    assertions: function (nonce, rawTxMaxNonce) {
      assert.strictEqual(nonce, "0x9");
      assert.strictEqual(rawTxMaxNonce, 9);
    }
  });
});

describe("setRawTransactionNonce", function () {
  var test = function (t) {
    it(t.description, function () {
      var verifyRawTransactionNonce = rpc.verifyRawTransactionNonce;
      var pendingTxCount = rpc.pendingTxCount;
      rpc.resetState();
      rpc.verifyRawTransactionNonce = function (nonce) {
        return nonce;
      };
      rpc.pendingTxCount = function (address, callback) {
        if (!callback) return t.blockchain.transactionCount;
        callback(t.blockchain.transactionCount);
      };
      var packaged = rpc.setRawTransactionNonce(t.params.packaged, t.params.address, t.params.callback);
      if (!t.params.callback) t.assertions(packaged);
      rpc.verifyRawTransactionNonce = verifyRawTransactionNonce;
      rpc.pendingTxCount = pendingTxCount;
    });
  };
  test({
    description: "10 transactions, without callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b"
    },
    blockchain: {
      transactionCount: "0xa"
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {nonce: 10});
    }
  });
  test({
    description: "10 transactions, with callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {nonce: 10});
      }
    },
    blockchain: {
      transactionCount: "0xa"
    }
  });
  test({
    description: "Error from pendingTxCount, without callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b"
    },
    blockchain: {
      transactionCount: {error: -32000}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {nonce: 0});
    }
  });
  test({
    description: "Error from pendingTxCount, with callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {nonce: 0});
      }
    },
    blockchain: {
      transactionCount: {error: -32000}
    }
  });
});

describe("setRawTransactionGasPrice", function () {
  var test = function (t) {
    it(t.description, function () {
      var getGasPrice = rpc.getGasPrice;
      var pendingTxCount = rpc.pendingTxCount;
      rpc.resetState();
      rpc.getGasPrice = function (callback) {
        if (!callback) return t.blockchain.gasPrice;
        callback(t.blockchain.gasPrice);
      };
      rpc.pendingTxCount = function (address, callback) {
        if (!callback) return t.blockchain.transactionCount;
        callback(t.blockchain.transactionCount);
      };
      var packaged = rpc.setRawTransactionGasPrice(t.params.packaged, t.params.callback);
      if (!t.params.callback) t.assertions(packaged);
      rpc.getGasPrice = getGasPrice;
      rpc.pendingTxCount = pendingTxCount;
    });
  };
  test({
    description: "Without callback",
    params: {
      packaged: {},
      address: "0xb0b"
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {gasPrice: "0x4a817c800"});
    }
  });
  test({
    description: "With callback",
    params: {
      packaged: {},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {gasPrice: "0x4a817c800"});
      }
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    }
  });
  test({
    description: "Without callback, gasPrice specified by caller",
    params: {
      packaged: {gasPrice: "0x1"},
      address: "0xb0b"
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {gasPrice: "0x1"});
    }
  });
  test({
    description: "With callback, gasPrice specified by caller",
    params: {
      packaged: {gasPrice: "0x1"},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {gasPrice: "0x1"});
      }
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    }
  });
});

describe("packageRawTransaction", function () {
  var test = function (t) {
    it(t.description, function () {
      rpc.resetState();
      rpc.block = t.state.block;
      rpc.networkID = t.state.networkID;
      t.assertions(rpc.packageRawTransaction(t.params.payload, t.params.address));
    });
  };
  test({
    description: "No gasLimit, no gasPrice",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0xb0b"
    },
    state: {
      networkID: "7",
      block: {gasLimit: 10}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {
        from: "0xb0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: 0,
        value: "0x0",
        gasLimit: "0xa",
        chainId: 7,
      });
    }
  });
  test({
    description: "gasLimit, no gasPrice",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        gasLimit: 15
      },
      address: "0xb0b"
    },
    state: {
      networkID: "7",
      block: {gasLimit: 10}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {
        from: "0xb0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: 0,
        value: "0x0",
        chainId: 7,
        gasLimit: "0xf"
      });
    }
  });
  test({
    description: "gasLimit and gasPrice",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        gasLimit: 15,
        gasPrice: 100
      },
      address: "0xb0b"
    },
    state: {
      networkID: "7",
      block: {gasLimit: 10}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {
        from: "0xb0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: 0,
        value: "0x0",
        chainId: 7,
        gasLimit: "0xf",
        gasPrice: "0x64"
      });
    }
  });
});

describe("packageAndSignRawTransaction", function () {
  var test = function (t) {
    it(t.description, function () {
      var setRawTransactionGasPrice = rpc.setRawTransactionGasPrice;
      var setRawTransactionNonce = rpc.setRawTransactionNonce;
      rpc.resetState();
      rpc.setRawTransactionGasPrice = function (packaged, callback) {
        packaged.gasPrice = t.blockchain.gasPrice;
        if (!callback) return packaged;
        callback(packaged);
      };
      rpc.setRawTransactionNonce = function (packaged, address, callback) {
        packaged.nonce = parseInt(t.blockchain.transactionCount, 16);
        if (!callback) return packaged;
        callback(packaged);
      };
      var output = rpc.packageAndSignRawTransaction(t.params.payload, t.params.address, t.params.privateKey, t.params.callback);
      if (!t.params.callback) t.assertions(output);
      rpc.setRawTransactionGasPrice = setRawTransactionGasPrice;
      rpc.setRawTransactionNonce = setRawTransactionNonce;
    });
  };
  test({
    description: "Without callback",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa"
    },
    assertions: function (signedRawTransaction) {
      assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
    }
  });
  test({
    description: "With callback",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
      callback: function (signedRawTransaction) {
        assert.deepEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
      }
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa"
    }
  });
});

describe("packageAndSubmitRawTransaction", function () {
  var test = function (t) {
    it(t.description, function () {
      var packageAndSignRawTransaction = rpc.packageAndSignRawTransaction;
      var sendRawTransaction = rpc.sendRawTransaction;
      rpc.resetState();
      rpc.packageAndSignRawTransaction = t.stub.packageAndSignRawTransaction;
      rpc.sendRawTransaction = t.stub.sendRawTransaction;
      var output;
      try {
        output = rpc.packageAndSubmitRawTransaction(t.params.payload, t.params.address, t.params.privateKey);
      } catch (exc) {
        output = exc;
      }
      t.assertions(output);
      rpc.packageAndSubmitRawTransaction(t.params.payload, t.params.address, t.params.privateKey, t.assertions);
      rpc.packageAndSignRawTransaction = packageAndSignRawTransaction;
      rpc.sendRawTransaction = sendRawTransaction;
    });
  };
  test({
    description: "Successful raw transaction submission",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        assert.deepEqual(payload, {
          method: "addMarketToBranch",
          returns: "int256",
          send: true,
          signature: ["int256", "int256"],
          params: ["101010", "0xa1"],
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
        });
        assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
        assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
        var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1"
        if (!callback) return signedRawTransaction;
        callback(signedRawTransaction);
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
        var txhash = "0x00000000000000000000000000000000000000000000000000000000deadbeef";
        if (!callback) return txhash;
        callback(txhash);
      }
    },
    assertions: function (response) {
      assert.strictEqual(response, "0x00000000000000000000000000000000000000000000000000000000deadbeef");
    }
  });
  test({
    description: "packageAndSendRawTransaction throws TRANSACTION_FAILED error",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        assert.deepEqual(payload, {
          method: "addMarketToBranch",
          returns: "int256",
          send: true,
          signature: ["int256", "int256"],
          params: ["101010", "0xa1"],
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
        });
        assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
        assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
        var err = errors.TRANSACTION_FAILED;
        if (!callback) throw new rpc.Error(err);
        callback(err);
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        assert.fail();
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.TRANSACTION_FAILED.error);
      assert.strictEqual(err.message, errors.TRANSACTION_FAILED.message);
    }
  });
  test({
    description: "packageAndSendRawTransaction throws NOT_LOGGED_IN error",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        assert.deepEqual(payload, {
          method: "addMarketToBranch",
          returns: "int256",
          send: true,
          signature: ["int256", "int256"],
          params: ["101010", "0xa1"],
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
        });
        assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
        assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
        var err = errors.NOT_LOGGED_IN;
        if (!callback) throw new rpc.Error(err);
        callback(err);
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        assert.fail();
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.NOT_LOGGED_IN.error);
      assert.strictEqual(err.message, errors.NOT_LOGGED_IN.message);
    }
  });
  test({
    description: "sendRawTransaction receives a null response",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        assert.deepEqual(payload, {
          method: "addMarketToBranch",
          returns: "int256",
          send: true,
          signature: ["int256", "int256"],
          params: ["101010", "0xa1"],
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
        });
        assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
        assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
        var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1"
        if (!callback) return signedRawTransaction;
        callback(signedRawTransaction);
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
        var err = errors.RAW_TRANSACTION_ERROR;
        if (!callback) throw new rpc.Error(err);
        callback(err);
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.RAW_TRANSACTION_ERROR.error);
      assert.strictEqual(err.message, errors.RAW_TRANSACTION_ERROR.message);
    }
  });
  test({
    description: "sendRawTransaction response is -32603: rlp encoding error",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        assert.deepEqual(payload, {
          method: "addMarketToBranch",
          returns: "int256",
          send: true,
          signature: ["int256", "int256"],
          params: ["101010", "0xa1"],
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
        });
        assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
        assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
        var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1"
        if (!callback) return signedRawTransaction;
        callback(signedRawTransaction);
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
        var err = {error: -32603, message: "rlp encoding error"};
        if (!callback) return err;
        callback(err);
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.RLP_ENCODING_ERROR.error);
      assert.strictEqual(err.message, errors.RLP_ENCODING_ERROR.message);
    }
  });
  test({
    description: "sendRawTransaction response is -32000: Nonce too low",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      isRetry: false,
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        assert.deepEqual(payload, {
          method: "addMarketToBranch",
          returns: "int256",
          send: true,
          signature: ["int256", "int256"],
          params: ["101010", "0xa1"],
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
        });
        assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
        assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
        var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1"
        if (!callback) return signedRawTransaction;
        callback(signedRawTransaction);
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
        if (this.isRetry === false) {
          this.isRetry = true;
          var err = {error: -32000, message: "Nonce too low"};
          if (!callback) return err;
          callback(err);
        }
        if (!callback) return undefined;
        callback(undefined);
      }
    },
    assertions: function (output) {
      try {
        assert.isNull(output);
      } catch (exc) {
        assert.instanceOf(exc, Error);
        assert.strictEqual(exc.name, "AssertionError");
        assert.strictEqual(output.error, errors.RAW_TRANSACTION_ERROR.error);
        assert.strictEqual(output.message, errors.RAW_TRANSACTION_ERROR.message);
      }
    }
  });
});
