/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var async = require("async");
var clone = require("clone");
var contracts = require("augur-contracts");
var errors = contracts.errors;
var abi = require("augur-abi");
var rpc = require("../");
var DEBUG = false;

require('it-each')({testPerIteration: true});

var requests = 0;
var TIMEOUT = 720000;
var COINBASE = "0x00bae5113ee9f252cceb0001205b88fad175461a";
var SHA3_INPUT = "boom!";
var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
var PROTOCOL_VERSION = "0x3f";
var TXHASH = "0xc52b258dec9e8374880b346f93669d7699d7e64d46c8b6072b19122ca9406461";
var NETWORK_ID = "3";
contracts = contracts[NETWORK_ID];
var HOSTED_NODES;
rpc.retryDroppedTxs = false;
rpc.debug.sync = false;
rpc.debug.tx = DEBUG;
rpc.debug.broadcast = DEBUG;

describe("RPCError", function () {
  var test = function (t) {
    var invoke;
    before(function () { invoke = rpc.invoke; });
    after(function () { rpc.invoke = invoke; });
    it("[sync] " + JSON.stringify(t), function () {
      rpc.invoke = function (payload, callback) {
        if (!callback) return t.response;
        callback(t.response);
      };
      assert.throws(function () { rpc.fire(t.payload); }, rpc.Error);
    });
    it("[async] " + JSON.stringify(t), function (done) {
      rpc.fire(t.payload, function (res) {
        var errCode = abi.bignum(t.response, "string", true);
        var err = errors[t.payload.method][errCode];
        assert.strictEqual(res.message, err);
        done();
      });
    });
  };
  test({
    payload: {method: "cashFaucet", returns: "number"},
    response: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  });
  test({
    payload: {method: "createEvent", returns: "hash"},
    response: "0x0"
  });
  test({
    payload: {method: "createEvent", returns: "hash"},
    response: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  });
  test({
    payload: {method: "createEvent", returns: "hash"},
    response: "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
  });
  test({
    payload: {method: "createMarket", returns: "hash"},
    response: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  });
  test({
    payload: {method: "createMarket", returns: "hash"},
    response: "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
  });
  test({
    payload: {method: "createMarket", returns: "hash"},
    response: "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd"
  });
  test({
    payload: {method: "closeMarket", returns: "number"},
    response: "0x0"
  });
  test({
    payload: {method: "closeMarket", returns: "number"},
    response: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  });
  test({
    payload: {method: "trade", returns: "hash[]"},
    response: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  });
  test({
    payload: {method: "trade", returns: "hash[]"},
    response: "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
  });
  test({
    payload: {method: "trade", returns: "hash[]"},
    response: "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd"
  });
});

describe("wsConnect", function () {
  var test = function (t) {
    it(JSON.stringify(t), function (done) {
      rpc.wsUrl = t.wsUrl;
      rpc.rpcStatus.ws = t.rpcStatus.ws;
      rpc.wsConnect(function (connected) {
        assert.strictEqual(connected, t.expected.connected);
        assert.strictEqual(rpc.wsUrl, t.expected.wsUrl);
        assert.strictEqual(rpc.rpcStatus.ws, t.expected.rpcStatus.ws);
        if (connected) {
          assert.strictEqual(rpc.websocket.readyState, rpc.websocket.OPEN);
        }
        done();
      });
    });
  };
  test({
    wsUrl: "wss://ws.augur.net",
    rpcStatus: {ws: 0},
    expected: {
      connected: true,
      wsUrl: "wss://ws.augur.net",
      rpcStatus: {ws: 1}
    }
  });
  test({
    wsUrl: "wss://ws.augur.net",
    rpcStatus: {ws: -1},
    expected: {
      connected: true,
      wsUrl: "wss://ws.augur.net",
      rpcStatus: {ws: 1}
    }
  });
  test({
    wsUrl: "ws://127.0.0.2:1212",
    rpcStatus: {ws: 0},
    expected: {
      connected: false,
      wsUrl: null,
      rpcStatus: {ws: -1}
    }
  });
  test({
    wsUrl: "ws://127.0.0.2:1212",
    rpcStatus: {ws: -1},
    expected: {
      connected: false,
      wsUrl: null,
      rpcStatus: {ws: -1}
    }
  });
  test({
    wsUrl: null,
    rpcStatus: {ws: 0},
    expected: {
      connected: false,
      wsUrl: null,
      rpcStatus: {ws: -1}
    }
  });
});

describe("messageAction", function () {
  var test = function (t) {
    it(JSON.stringify(t), function (done) {
      if (t.msg.method === "eth_subscription") {
        rpc.registerSubscriptionCallback(t.msg.params.subscription, function (result) {
          assert.strictEqual(result, t.expected);
          done();
        });
        rpc.messageAction("ws", t.msg);
      } else if (t.msg.constructor === Array) {
        var callbacksFired = [];
        async.forEachOf(t.msg, function (msg, i, nextMsg) {
          callbacksFired.push(false);
          rpc.rpcRequests.ws[msg.id] = {
            callback: function (result) {
              callbacksFired[i] = true;
              assert.strictEqual(result, t.expected[i]);
              for (var j = 0; j < t.msg.length; ++j) {
                if (!callbacksFired[j]) return;
              }
              done();
            }
          };
          nextMsg();
        }, function (err) {
          assert.isNull(err);
          rpc.messageAction("ws", t.msg);
        });
      } else {
        rpc.rpcRequests.ws[t.msg.id] = {
          callback: function (result) {
            assert.strictEqual(result, t.expected);
            done();
          }
        };
        rpc.messageAction("ws", t.msg);
      }
    });
  };
  test({
    type: "ws",
    msg: {
      jsonrpc: "2.0",
      id: 1,
      result: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
    },
    expected: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
  });
  test({
    type: "ws",
    msg: {
      method: "eth_subscription",
      params: {
        subscription: "0x1",
        result: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
      },
    },
    expected: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
  });
  test({
    type: "ws",
    msg: [{
      jsonrpc: "2.0",
      id: 1,
      result: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
    }, {
      jsonrpc: "2.0",
      id: 2,
      result: "0x0000000000000000000000000000000000000000000000028c418afbbb5c0000"
    }],
    expected: [
      "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000",
      "0x0000000000000000000000000000000000000000000000028c418afbbb5c0000"
    ]
  });
  test({
    type: "ws",
    msg: [{
      jsonrpc: "2.0",
      id: 1,
      result: "0x0000000000000000000000000000000000000000000000000000000000000001"
    }, {
      jsonrpc: "2.0",
      id: 2,
      result: "0x0000000000000000000000000000000000000000000000000000000000000002"
    }, {
      jsonrpc: "2.0",
      id: 3,
      result: "0x0000000000000000000000000000000000000000000000000000000000000003"
    }, {
      jsonrpc: "2.0",
      id: 4,
      result: "0x0000000000000000000000000000000000000000000000000000000000000004"
    }, {
      jsonrpc: "2.0",
      id: 5,
      result: "0x0000000000000000000000000000000000000000000000000000000000000005"
    }, {
      jsonrpc: "2.0",
      id: 6,
      result: "0x0000000000000000000000000000000000000000000000000000000000000006"
    }, {
      jsonrpc: "2.0",
      id: 7,
      result: "0x0000000000000000000000000000000000000000000000000000000000000007"
    }],
    expected: [
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000000000000000000000000000002",
      "0x0000000000000000000000000000000000000000000000000000000000000003",
      "0x0000000000000000000000000000000000000000000000000000000000000004",
      "0x0000000000000000000000000000000000000000000000000000000000000005",
      "0x0000000000000000000000000000000000000000000000000000000000000006",
      "0x0000000000000000000000000000000000000000000000000000000000000007"
    ]
  });
  test({
    type: "ipc",
    msg: {
      jsonrpc: "2.0",
      id: 1,
      result: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
    },
    expected: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
  });
  test({
    type: "ipc",
    msg: {
      method: "eth_subscription",
      params: {
        subscription: "0x1",
        result: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
      },
    },
    expected: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
  });
  test({
    type: "ipc",
    msg: [{
      jsonrpc: "2.0",
      id: 1,
      result: "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000"
    }, {
      jsonrpc: "2.0",
      id: 2,
      result: "0x0000000000000000000000000000000000000000000000028c418afbbb5c0000"
    }],
    expected: [
      "0x00000000000000000000000000000000000000000000021a72a75ef8d57ef000",
      "0x0000000000000000000000000000000000000000000000028c418afbbb5c0000"
    ]
  });
  test({
    type: "ipc",
    msg: [{
      jsonrpc: "2.0",
      id: 1,
      result: "0x0000000000000000000000000000000000000000000000000000000000000001"
    }, {
      jsonrpc: "2.0",
      id: 2,
      result: "0x0000000000000000000000000000000000000000000000000000000000000002"
    }, {
      jsonrpc: "2.0",
      id: 3,
      result: "0x0000000000000000000000000000000000000000000000000000000000000003"
    }, {
      jsonrpc: "2.0",
      id: 4,
      result: "0x0000000000000000000000000000000000000000000000000000000000000004"
    }, {
      jsonrpc: "2.0",
      id: 5,
      result: "0x0000000000000000000000000000000000000000000000000000000000000005"
    }, {
      jsonrpc: "2.0",
      id: 6,
      result: "0x0000000000000000000000000000000000000000000000000000000000000006"
    }, {
      jsonrpc: "2.0",
      id: 7,
      result: "0x0000000000000000000000000000000000000000000000000000000000000007"
    }],
    expected: [
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000000000000000000000000000002",
      "0x0000000000000000000000000000000000000000000000000000000000000003",
      "0x0000000000000000000000000000000000000000000000000000000000000004",
      "0x0000000000000000000000000000000000000000000000000000000000000005",
      "0x0000000000000000000000000000000000000000000000000000000000000006",
      "0x0000000000000000000000000000000000000000000000000000000000000007"
    ]
  });
});

describe("packageRequest", function () {
  var test = function (t) {
    it(JSON.stringify(t), function () {
      var packaged = rpc.packageRequest(t.payload);
      assert.deepEqual(packaged, t.packaged);
    });
  };
  test({
    payload: {
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "to": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
      "value": "1000000000000000000",
      "send": true
    },
    packaged: {
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "to": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
      "data": "0x3af39c21",
      "gas": "0x2fd618",
      "value": "0xde0b6b3a7640000"
    }
  });
  test({
    payload: {
      "inputs": ["branch"],
      "method": "fundNewAccount",
      "returns": "number",
      "send": false,
      "signature": ["int256"],
      "to": "0xe6c4afd17c291eaba28283be18466516e7cbe66d",
      "from": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
      "params": ["0xf69b5"]
    },
    packaged: {
      "from": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
      "to": "0xe6c4afd17c291eaba28283be18466516e7cbe66d",
      "data": "0x5f92896e00000000000000000000000000000000000000000000000000000000000f69b5",
      "gas": "0x2fd618",
      "returns": "number"
    }
  });
  test({
    payload: {
      "inputs": [
        "branch"
      ],
      "method": "fundNewAccount",
      "returns": "number",
      "send": false,
      "signature": [
        "int256"
      ],
      "to": "0xe6c4afd17c291eaba28283be18466516e7cbe66d",
      "from": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
      "params": [
        "0xf69b5"
      ],
      "invocation": {
        "context": {
          "account": {
            "name": "99b816c1c5e061f236af9a4f98620cb3e23bc984f42ef8a0e901d23e6a644e62",
            "secureLoginID": "7WEFsCdBsBmBffCsx9z6pLzYpTVpgq8odSJSDXZmb4u4rzziA6CsEZ75mcDj694NznSyVnWaNb7yG1LwHyYsW5oqmMSMAhFa4yi6TaSDcovp6shb14ZYzA7shTmcU3UAuoT8oKucCHisdAdsZuKmC4gzCp6BanmtLXMeoXfndgRjcJQtfPB2nRXHK2enJp1tptyVWKnYnkyZsHrnZgfUNKBBSq2LdT53aYUSAo5Cqx791AZBU2Txu8KrAcVXbMQ2qcJqDmFmnA5L9PWHDmaZzY9v1ySsaq3RHxRokfKf7PCqyGCdvxU984hbrzq57kcw1FE3h9wAGK7tgWZQYHF1XJX3PUTBbadcso3dvNxCcfPjSBx99cFi6uoHJy8rw5V3sPbGhqEpyqcEMnKyUHChA9FDR6MtGPUdocaKLPTqzGAoYRomkNmt1BQCuN4yeaU9YdqCPXfjSX3uUU1WoThaig4nnkzyAMvAW2CaCNZeRCGJ4M79RYQpdHL5fsvtP6n6fSDwmZ7WRUwnsbM4RP8rK9F8waLVJThKSa3i8gbyBPEJ5os51jjrGytxWF72NAS6Rvc4EaaeQnGok56JuDJ6zsPuGyegrqrPnYnzikjqirw4qmW8aYcTkeLXhgTNpM58MvCVDnbmLWMb8VrEaZnmNksK694JVGS4w7yxFFeS5oH1YRZU78Nb5QA4hvtJQbJpXwRNXe1WuwUeAbkMMASTXW2uUUYjoRe7spPxUeK9qZ39vaE957HArRbF3h4MJbNwgtR26D9KbXx3mQFmRpiNJME1hTfW6SyNbe",
            "privateKey": {
              "type": "Buffer",
              "data": [
                70,
                220,
                93,
                9,
                47,
                243,
                216,
                53,
                251,
                90,
                233,
                182,
                198,
                80,
                238,
                44,
                41,
                111,
                70,
                85,
                145,
                211,
                139,
                165,
                26,
                188,
                109,
                229,
                190,
                108,
                16,
                248
              ]
            },
            "address": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
            "keystore": {
              "address": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
              "crypto": {
                "cipher": "aes-128-ctr",
                "ciphertext": "5cb054f93ece6768abf6592dca5f12712491a23a8b713b1d82a2fa9d487c652d",
                "cipherparams": {
                  "iv": "df1cffbaee2919b60e78f7abf47fd46f"
                },
                "kdf": "pbkdf2",
                "kdfparams": {
                  "c": 65536,
                  "dklen": 32,
                  "prf": "hmac-sha256",
                  "salt": "a2cdda9e0fafefb8212fb81058c078d16c75b4eb3585df9b78d22f8d33f995dd"
                },
                "mac": "99dd350011d67c3ca57576fa30e241248f186ef3a7feee83ca4734041a86b054"
              },
              "version": 3,
              "id": "1cb3e775-d22e-4566-9393-8f6a0d52ecb0"
            }
          }
        }
      }
    },
    packaged: {
      "from": "0xc98fef1cae0c5e130b2580cb04aa7fbdf7bf736d",
      "to": "0xe6c4afd17c291eaba28283be18466516e7cbe66d",
      "data": "0x5f92896e00000000000000000000000000000000000000000000000000000000000f69b5",
      "gas": "0x2fd618",
      "returns": "number"
    }
  });
  test({
    payload: {
      "inputs": [
        "branch",
        "description",
        "expDate",
        "minValue",
        "maxValue",
        "numOutcomes",
        "resolution"
      ],
      "method": "createEvent",
      "send": true,
      "signature": [
        "int256",
        "bytes",
        "int256",
        "int256",
        "int256",
        "int256",
        "bytes"
      ],
      "to": "0x181ab5cfb79c3a4edd7b4556412b40453edeec32",
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "params": [
        "0xf69b5",
        "€lujksaaj0fqxdqrtmg3nmi",
        1477161170,
        "0xde0b6b3a7640000",
        "0x1bc16d674ec80000",
        2,
        "https://www.google.com"
      ]
    },
    packaged: {
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "to": "0x181ab5cfb79c3a4edd7b4556412b40453edeec32",
      "data": "0x3c1f6f6300000000000000000000000000000000000000000000000000000000000f69b500000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000580bb0d20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000019e282ac6c756a6b7361616a30667178647172746d67336e6d6900000000000000000000000000000000000000000000000000000000000000000000000000001668747470733a2f2f7777772e676f6f676c652e636f6d00000000000000000000",
      "gas": "0x2fd618"
    }
  });
  test({
    payload: {
      "inputs": [
        "address",
        "balance"
      ],
      "method": "setCash",
      "returns": "number",
      "send": false,
      "signature": [
        "int256",
        "int256"
      ],
      "to": "0x63f021dbfeb3d81bfcd5b746965ff2e298931adb",
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "params": [
        "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
        "0x52b7d2dcc80cd2e4000000"
      ]
    },
    packaged: {
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "to": "0x63f021dbfeb3d81bfcd5b746965ff2e298931adb",
      "data": "0x1d62e9220000000000000000000000007c0d52faab596c08f484e3478aebc6205f3f5d8c00000000000000000000000000000000000000000052b7d2dcc80cd2e4000000",
      "gas": "0x2fd618",
      "returns": "number"
    }
  });
  test({
    payload: {
      "inputs": [
        "branch",
        "description",
        "expDate",
        "minValue",
        "maxValue",
        "numOutcomes",
        "resolution",
        "tradingFee",
        "tag1",
        "tag2",
        "tag3",
        "makerFees",
        "extraInfo"
      ],
      "method": "createSingleEventMarket",
      "mutable": true,
      "send": true,
      "signature": [
        "int256",
        "bytes",
        "int256",
        "int256",
        "int256",
        "int256",
        "bytes",
        "int256",
        "int256",
        "int256",
        "int256",
        "int256",
        "bytes"
      ],
      "to": "0x181ab5cfb79c3a4edd7b4556412b40453edeec32",
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "params": [
        "0xf69b5",
        "Will Gary Johnson be included in at least one nationally televised Presidential debate in 2016, in which Hillary Clinton and Donald Trump also participate?",
        2874005402,
        "0xde0b6b3a7640000",
        "0x1bc16d674ec80000",
        2,
        "",
        "0x470de4df820000",
        "0x706f6c6974696373000000000000000000000000000000000000000000000000",
        "0x555320656c656374696f6e730000000000000000000000000000000000000000",
        "0x707265736964656e7469616c2064656261746573000000000000000000000000",
        "0x6f05b59d3b20000",
        "Candidates must be polling at 15% or higher to be included in the Presidential debates."
      ],
      "gasPrice": "0x4a817c800",
      "value": "0x78cad1e25d0000"
    },
    packaged: {
      "from": "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
      "to": "0x181ab5cfb79c3a4edd7b4556412b40453edeec32",
      "data": "0x47c7ea4200000000000000000000000000000000000000000000000000000000000f69b500000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000ab4dd79a0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000001bc16d674ec800000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000470de4df820000706f6c6974696373000000000000000000000000000000000000000000000000555320656c656374696f6e730000000000000000000000000000000000000000707265736964656e7469616c206465626174657300000000000000000000000000000000000000000000000000000000000000000000000006f05b59d3b2000000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000000000009b57696c6c2047617279204a6f686e736f6e20626520696e636c7564656420696e206174206c65617374206f6e65206e6174696f6e616c6c792074656c65766973656420507265736964656e7469616c2064656261746520696e20323031362c20696e2077686963682048696c6c61727920436c696e746f6e20616e6420446f6e616c64205472756d7020616c736f2070617274696369706174653f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005743616e64696461746573206d75737420626520706f6c6c696e6720617420313525206f722068696768657220746f20626520696e636c7564656420696e2074686520507265736964656e7469616c20646562617465732e000000000000000000",
      "gas": "0x2fd618",
      "gasPrice": "0x4a817c800",
      "value": "0x78cad1e25d0000"
    }
  });
});

describe("send", function () {
  afterEach(function () { 
    rpc.websocket.close();
    rpc.rpcStatus.ws = 0;
  });
  var test = function (t) {
    it(JSON.stringify(t), function (done) {
      rpc.wsUrl = "wss://ws.augur.net";
      rpc.rpcStatus.ws = 0;
      rpc.wsConnect(function (connected) {
        assert.isTrue(connected);
        assert.strictEqual(rpc.websocket.readyState, rpc.websocket.OPEN);
        var callback;
        if (t.command.constructor !== Array) {
          callback = function (res) {
            assert.strictEqual(rpc.websocket.readyState, rpc.websocket.OPEN);
            assert.isUndefined(rpc.rpcRequests.ws[t.command.id]);
            assert.strictEqual(res, t.expected);
            done();
          };
          rpc.send("ws", t.command, t.returns, callback);
          assert.isObject(rpc.rpcRequests.ws[t.command.id]);
          assert.strictEqual(rpc.rpcRequests.ws[t.command.id].returns, t.returns);
          assert.strictEqual(rpc.rpcRequests.ws[t.command.id].callback, callback);
        } else {
          callback = [];
          async.forEachOf(t.command, function (command, i, nextCommand) {
            callback.push(function (res) {
              assert.strictEqual(rpc.websocket.readyState, rpc.websocket.OPEN);
              assert.isUndefined(rpc.rpcRequests.ws[command.id]);
              assert.strictEqual(res, t.expected[i]);
            });
            nextCommand();
          }, function (err) {
            assert.isNull(err);
            rpc.send("ws", t.command, t.returns, callback);
            for (var i = 0; i < t.command.length; ++i) {
              assert.isObject(rpc.rpcRequests.ws[t.command[i].id]);
              assert.strictEqual(rpc.rpcRequests.ws[t.command[i].id].returns, t.returns[i]);
            }
            done();
          });
        }
      });
    });
  };
  test({
    command: {
      id: ++requests,
      jsonrpc: "2.0",
      method: "eth_coinbase",
      params: []
    },
    returns: "address",
    expected: COINBASE
  });
  test({
    command: {
      id: ++requests,
      jsonrpc: "2.0",
      method: "web3_sha3",
      params: [SHA3_INPUT]
    },
    returns: "int256",
    expected: SHA3_DIGEST
  });
  test({
    command: {
      id: ++requests,
      jsonrpc: "2.0",
      method: "net_listening",
      params: []
    },
    returns: "bool",
    expected: true
  });
  test({
    command: {
      id: ++requests,
      jsonrpc: "2.0",
      method: "eth_protocolVersion",
      params: []
    },
    returns: "int256",
    expected: PROTOCOL_VERSION
  });
  test({
    command: [{
      id: ++requests,
      jsonrpc: "2.0",
      method: "web3_sha3",
      params: [SHA3_INPUT]
    }, {
      id: ++requests,
      jsonrpc: "2.0",
      method: "net_listening",
      params: []
    }],
    returns: ["int256", "bool"],
    expected: [SHA3_DIGEST, true]
  });
});

describe("RPC", function () {

  function runtests(wsUrl) {

    before(function () {
      rpc.reset();
      rpc.ipcpath = null;
      HOSTED_NODES = rpc.nodes.hosted.slice();
      rpc.wsUrl = wsUrl;
      if (!wsUrl) rpc.rpcStatus.ws = -1;
      rpc.useHostedNode();
    });

    describe("marshal", function () {
      var test = function (t) {
        it(t.prefix + t.command + " -> " + JSON.stringify(t.expected), function () {
          var actual = rpc.marshal(t.command, t.params || [], t.prefix);
          actual.id = t.expected.id;
          assert.deepEqual(actual, t.expected);
        });
      };
      test({
        prefix: "eth_",
        command: "coinbase",
        expected: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_coinbase",
          params: []
        }
      });
      test({
        prefix: "web3_",
        command: "sha3",
        params: "boom!",
        expected: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "web3_sha3",
          params: ["boom!"]
        }
      });
      test({
        prefix: "net_",
        command: "listening",
        expected: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "net_listening",
          params: []
        }
      });
      test({
        prefix: "eth_",
        command: "protocolVersion",
        expected: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_protocolVersion",
          params: []
        }
      });
    });

    describe("broadcast", function () {
      var test = function (t) {
        it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
          this.timeout(TIMEOUT);

          // synchronous
          var response = rpc.broadcast(t.command);
          if (response.error) {
            return done(response);
          }
          assert.strictEqual(response, t.expected);

          // asynchronous
          rpc.broadcast(t.command, function (res) {
            if (res.error) {
              done(res);
            } else {
              assert.strictEqual(res, t.expected);
              done();
            }
          });
        });
      };
      test({
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_coinbase",
          params: []
        },
        expected: COINBASE
      });
      test({
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "web3_sha3",
          params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
      });
      test({
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "net_listening",
          params: []
        },
        expected: true
      });
      test({
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_protocolVersion",
          params: []
        },
        expected: PROTOCOL_VERSION
      });
    });

    describe("post", function () {
      var test = function (t) {
        it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
          this.timeout(TIMEOUT);
          rpc.post(t.node, t.command, t.returns, function (res) {
            assert.strictEqual(res, t.expected);
            done();
          });
        });
      };
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_coinbase",
          params: []
        },
        returns: "address",
        expected: COINBASE
      });
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "web3_sha3",
          params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
      });
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "net_listening",
          params: []
        },
        expected: true
      });
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_protocolVersion",
          params: []
        },
        expected: PROTOCOL_VERSION
      });
    });

    describe("postSync", function () {
      var test = function (t) {
        it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
          this.timeout(TIMEOUT);
          var res = rpc.postSync(t.node, t.command, t.returns);
          if (res.error) {
            done(res.error);
          } else {
            assert.strictEqual(res, t.expected);
            done();
          }
        });
      };
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_coinbase",
          params: []
        },
        returns: "address",
        expected: COINBASE
      });
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "web3_sha3",
          params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
      });
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "net_listening",
          params: []
        },
        expected: true
      });
      test({
        node: "https://eth3.augur.net",
        command: {
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_protocolVersion",
          params: []
        },
        expected: PROTOCOL_VERSION
      });
    });

    describe("listening", function () {
      var test = function (t) {
        it(t.node + " -> " + t.listening, function (done) {
          this.timeout(TIMEOUT);
          rpc.reset();
          rpc.nodes.hosted = [t.node];
          assert.strictEqual(rpc.listening(), t.listening);
          rpc.listening(function (listening) {
            assert.strictEqual(listening, t.listening);
            done();
          });
        });
      };
      test({
        node: "https://eth3.augur.net",
        listening: true
      });
    });

    describe("version (network ID)", function () {
      var test = function (t) {
        it(t.node + " -> " + t.version, function (done) {
          this.timeout(TIMEOUT);
          rpc.reset();
          rpc.nodes.hosted = [t.node];
          assert.strictEqual(rpc.version(), t.version);
          rpc.version(function (version) {
            assert.strictEqual(version, t.version);
            done();
          });
        });
      };
      test({
        node: "https://eth3.augur.net",
        version: NETWORK_ID
      });
    });

    describe("unlocked", function () {
      var test = function (t) {
        it(t.node + " -> " + t.unlocked, function () {
          this.timeout(TIMEOUT);
          rpc.reset();
          rpc.nodes.hosted = [t.node];
          assert.strictEqual(rpc.unlocked(t.account), t.unlocked);
        });
      };
      test({
        node: "https://eth3.augur.net",
        account: "0x00bae5113ee9f252cceb0001205b88fad175461a",
        unlocked: false
      });
      test({
        node: "https://faucet.augur.net",
        account: "0xaff9cb4dcb19d13b84761c040c91d21dc6c991ec",
        unlocked: false
      });
      test({
        node: "https://report.augur.net",
        account: "0xcb42ebea8dff08f64480309ea3b0c1f45e4a378c",
        unlocked: false
      });
      test({
        node: null,
        account: COINBASE,
        unlocked: false
      });
      test({
        node: undefined,
        account: COINBASE,
        unlocked: false
      });
      test({
        node: NaN,
        account: COINBASE,
        unlocked: false
      });
    });

    describe("batch", function () {
      var test = function (res) {
        assert.isArray(res);
        assert.strictEqual(res.length, txList.length);
        for (var i = 0; i < txList.length; ++i) {
          assert.strictEqual(parseInt(res[i]), parseInt(rpc.invoke(txList[i])));
        }
      };
      var txList = [{
        to: contracts.Faucets,
        method: "reputationFaucet",
        inputs: ["branch"],
        signature: ["int256"],
        params: "0xf69b5",
        send: false,
        gasPrice: "0x4a817c800"
      }, {
        to: contracts.Faucets,
        method: "reputationFaucet",
        inputs: ["branch"],
        signature: ["int256"],
        params: "0xf69b5",
        send: false,
        gasPrice: "0x4a817c800"
      }];
      it("sync: return and match separate calls", function () {
        rpc.reset();
        test(rpc.batch(txList));
      });
      it("async: callback on whole array", function (done) {
        rpc.reset();
        rpc.batch(txList, function (r) {
          test(r); done();
        });
      });
    });

    describe("clear", function () {
      it("delete cached network/notification/transaction data", function (done) {
        this.timeout(TIMEOUT);
        rpc.reset();
        rpc.txs["0x1"] = { junk: "junk" };
        rpc.notifications["0x1"] = setTimeout(function () { done(1); }, 1500);
        rpc.clear();
        assert.deepEqual(rpc.txs, {});
        assert.deepEqual(rpc.notifications, {});
        setTimeout(done, 2000);
      });
    });

    describe("reset", function () {
      it("revert to default node list", function () {
        rpc.nodes.hosted = ["https://eth0.augur.net"];
        assert.isArray(rpc.nodes.hosted);
        assert.strictEqual(rpc.nodes.hosted.length, 1);
        assert.strictEqual(rpc.nodes.hosted[0], "https://eth0.augur.net");
        assert.isNull(rpc.nodes.local);
        assert.isArray(rpc.nodes.hosted);
        rpc.reset();
        assert.strictEqual(rpc.nodes.hosted.length, HOSTED_NODES.length);
        assert.deepEqual(rpc.nodes.hosted, HOSTED_NODES);
        rpc.reset();
        assert.isNull(rpc.nodes.local);
        assert.isArray(rpc.nodes.hosted);
        assert.strictEqual(rpc.nodes.hosted.length, HOSTED_NODES.length);
        assert.deepEqual(rpc.nodes.hosted, HOSTED_NODES);
      });
    });

    describe("Whisper", function () {
      var test = function (t) {
        it(JSON.stringify(t), function (done) {
          this.timeout(TIMEOUT);

          // sync
          var whisperID = rpc.shh("newIdentity");
          assert(whisperID);
          var filterID = rpc.shh("newFilter", {topics: t.topics});
          assert.isNumber(parseInt(filterID, 16));
          assert.isTrue(rpc.shh("post", {
            from: whisperID,
            topics: t.topics,
            payload: t.payload,
            priority: t.priority,
            ttl: t.ttl
          }));
          var filterChanges = rpc.shh("getFilterChanges", filterID);
          assert.isArray(filterChanges);
          assert.lengthOf(filterChanges, 1);
          assert.include(filterChanges.map(function (filterChange) {
            return abi.pad_left(filterChange.payload);
          }), abi.pad_left(t.payload));

          // async
          rpc.shh("post", {
            from: whisperID,
            topics: t.topics,
            payload: t.payload,
            priority: t.priority,
            ttl: t.ttl
          }, function (result) {
            assert.isTrue(result);
            rpc.shh("getFilterChanges", filterID, function (filterChanges) {
              assert.isArray(filterChanges);
              assert.lengthOf(filterChanges, 1);
              assert.include(filterChanges.map(function (filterChange) {
                return abi.pad_left(filterChange.payload);
              }), abi.pad_left(t.payload));
              rpc.shh("post", {
                from: whisperID,
                topics: t.topics,
                payload: t.payload,
                priority: t.priority,
                ttl: t.ttl
              }, function (result) {
                assert.isTrue(result);
                rpc.shh("getMessages", filterID, function (messages) {
                  assert.include(messages.map(function (message) {
                    return abi.pad_left(message.payload);
                  }), abi.pad_left(t.payload));
                  rpc.shh("uninstallFilter", filterID, function (uninstalled) {
                    assert.isTrue(uninstalled);
                    done();
                  });
                });
              });
            });
          });
        });
      };
      test({
        payload: abi.prefix_hex(abi.encode_hex("hello world")),
        topics: [abi.format_int256("0x1")],
        priority: "0x64",
        ttl: "0x64"
      });
      test({
        payload: abi.prefix_hex(abi.encode_hex("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.")),
        topics: [abi.format_int256("0x1")],
        priority: "0x64",
        ttl: "0x64"
      });
    });

    describe("Ethereum bindings", function () {
      it("raw('eth_protocolVersion')", function (done) {
        this.timeout(TIMEOUT);
        assert.strictEqual(rpc.raw("eth_protocolVersion"), PROTOCOL_VERSION);
        rpc.raw("eth_protocolVersion", PROTOCOL_VERSION, function (res) {
          if (res.error) return done(res);
          assert.strictEqual(res, PROTOCOL_VERSION);
          done();
        });
      });
      it("eth('protocolVersion')", function (done) {
        this.timeout(TIMEOUT);
        assert.strictEqual(rpc.eth("protocolVersion"), PROTOCOL_VERSION);
        rpc.eth("protocolVersion", null, function (res) {
          if (res.error) return done(res);
          assert.strictEqual(res, PROTOCOL_VERSION);
          done();
        });
      });
      it("sha3/keccak-256", function () {
        this.timeout(TIMEOUT);
        var data = {
          hex: "0x68656c6c6f20776f726c64",
          ascii: "Deposit(address,hash256,uint256)"
        };
        var expected = {
          hex: "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad",
          ascii: "0x50cb9fe53daa9737b786ab3646f04d0150dc50ef4e75f59509d83667ad5adb20"
        };

                // hex input
        assert.strictEqual(rpc.web3("sha3", data.hex), expected.hex);
        assert.strictEqual(rpc.sha3(data.hex, true), expected.hex);
        assert.strictEqual(rpc.web3("sha3", data.hex), rpc.sha3(data.hex, true));

                // ASCII input
        assert.strictEqual(rpc.web3("sha3", abi.encode_hex(data.ascii)), expected.ascii);
        assert.strictEqual(rpc.sha3(data.ascii), expected.ascii);
        assert.strictEqual(rpc.web3("sha3", abi.encode_hex(data.ascii)), rpc.sha3(data.ascii));
      });
      it("gasPrice", function (done) {
        this.timeout(TIMEOUT);
        assert.isAbove(parseInt(rpc.getGasPrice()), 0);
        rpc.getGasPrice(function (res) {
          if (res.error) return done(res);
          assert.isAbove(parseInt(res), 0);
          done();
        });
      });
      it("blockNumber", function (done) {
        this.timeout(TIMEOUT);
        assert.isAbove(parseInt(rpc.blockNumber()), 0);
        rpc.blockNumber(function (res) {
          if (res.error) return done(res);
          assert.isAbove(parseInt(res), 0);
          done();
        });
      });
      it("balance/getBalance", function (done) {
        this.timeout(TIMEOUT);
        var coinbase = "0xaff9cb4dcb19d13b84761c040c91d21dc6c991ec";
        assert.isAbove(parseInt(rpc.balance(coinbase)), 0);
        rpc.balance(coinbase, function (res) {
          if (res.error) return done(res);
          assert.isAbove(parseInt(res), 0);
          rpc.getBalance(coinbase, function (r) {
            if (r.error) return done(r);
            assert.isAbove(parseInt(r), 0);
            assert.strictEqual(r, res);
            rpc.balance(coinbase, "latest", function (r) {
              if (r.error) return done(r);
              assert.isAbove(parseInt(r), 0);
              assert.strictEqual(r, res);
              rpc.getBalance(coinbase, "latest", function (r) {
                if (r.error) return done(r);
                assert.isAbove(parseInt(r), 0);
                assert.strictEqual(r, res);
                rpc.balance(coinbase, null, function (r) {
                  if (r.error) return done(r);
                  assert.isAbove(parseInt(r), 0);
                  assert.strictEqual(r, res);
                  rpc.getBalance(coinbase, null, function (r) {
                    if (r.error) return done(r);
                    assert.isAbove(parseInt(r), 0);
                    assert.strictEqual(r, res);
                    done();
                  });
                });
              });
            });
          });
        });
      });
      it("txCount/getTransactionCount", function (done) {
        this.timeout(TIMEOUT);
        var coinbase = "0xaff9cb4dcb19d13b84761c040c91d21dc6c991ec";
        assert(parseInt(rpc.txCount(coinbase)) >= 0);
        assert(parseInt(rpc.pendingTxCount(coinbase)) >= 0);
        rpc.txCount(coinbase, function (res) {
          if (res.error) return done(res);
          assert(parseInt(res) >= 0);
          rpc.pendingTxCount(coinbase, function (res) {
            if (res.error) return done(res);
            assert(parseInt(res) >= 0);
            done();
          });
        });
      });
      it("peerCount", function (done) {
        this.timeout(TIMEOUT);
        switch (NETWORK_ID) {
          case "10101":
            assert.strictEqual(rpc.peerCount(), 0);
            rpc.peerCount(function (res) {
              if (res.error) return done(res);
              assert.strictEqual(parseInt(res), 0);
              done();
            });
            break;
          default:
            assert(rpc.peerCount() >= 0);
            rpc.peerCount(function (res) {
              if (res.error) return done(res);
              assert(parseInt(res) >= 0);
              done();
            });
        }
      });
      it("hashrate", function (done) {
        this.timeout(TIMEOUT);
        assert(rpc.hashrate() >= 0);
        rpc.hashrate(function (res) {
          if (res.error) return done(res);
          assert(parseInt(res) >= 0);
          done();
        });
      });
      it("mining", function (done) {
        this.timeout(TIMEOUT);
        switch (rpc.version()) {
          case "10101":
            assert.isTrue(rpc.mining());
            rpc.mining(function (res) {
              if (res.error) return done(res);
              assert.isTrue(res);
              done();
            });
            break;
          default:
            assert.isBoolean(rpc.mining());
            rpc.mining(function (res) {
              if (res.error) return done(res);
              assert.isBoolean(res);
              done();
            });
        }
      });
      it("clientVersion", function (done) {
        this.timeout(TIMEOUT);
        var clientVersion = rpc.clientVersion();
        assert.isString(clientVersion);
        assert.strictEqual(clientVersion.split('/')[0], "Geth");
        rpc.clientVersion(function (res) {
          if (res.error) return done(res);
          assert.isString(res);
          assert.strictEqual(res.split('/')[0], "Geth");
          done();
        });
      });
    });

    describe("fastforward", function () {
      var test = function (blocks) {
        it("blocks=" + blocks, function (done) {
          this.timeout(TIMEOUT*blocks);
          rpc.blockNumber(function (startBlock) {
            assert.notProperty(startBlock, "error");
            startBlock = parseInt(startBlock);
            assert.isAbove(startBlock, 0);
            rpc.fastforward(blocks, function (endBlock) {
              assert.notProperty(endBlock, "error");
              endBlock = parseInt(endBlock);
              assert.isAtLeast(endBlock - startBlock, blocks);
              done();
            });
          });
        });
      };
      test(0);
      test(1);
      test(2);
    });

    describe("getBlock", function () {
      var asserts = function (t, block) {
        assert.property(block, "number");
        assert.property(block, "parentHash");
        assert.property(block, "hash");
        assert.property(block, "nonce");
        assert.property(block, "sha3Uncles");
        assert.property(block, "logsBloom");
        assert.property(block, "transactionsRoot");
        assert.property(block, "stateRoot");
        assert.property(block, "miner");
        assert.property(block, "difficulty");
        assert.property(block, "totalDifficulty");
        assert.property(block, "size");
        assert.property(block, "extraData");
        assert.property(block, "gasLimit");
        assert.property(block, "gasUsed");
        assert.property(block, "timestamp");
        assert.property(block, "transactions");
        assert.property(block, "uncles");
        assert.isAbove(parseInt(block.number), 0);
        assert.isAbove(parseInt(block.hash), 0);
        assert.isAbove(parseInt(block.parentHash), 0);
        assert.isAbove(parseInt(block.nonce), 0);
        assert.isAbove(parseInt(block.sha3Uncles), 0);
        assert.isAbove(parseInt(block.transactionsRoot), 0);
        assert.isAbove(parseInt(block.stateRoot), 0);
        assert.isAbove(parseInt(block.miner), 0);
        assert.isAbove(parseInt(block.difficulty), 0);
        assert.isAbove(parseInt(block.totalDifficulty), 0);
        assert.isAbove(parseInt(block.gasLimit), 0);
        assert.isAbove(parseInt(block.timestamp), 0);
        assert.isAbove(parseInt(block.number), 0);
        assert.isArray(block.transactions);
        assert.isArray(block.uncles);
        assert.strictEqual(parseInt(block.number), parseInt(t.blockNumber));
        assert.strictEqual(block.hash, t.blockHash);
      };
      var test = function (t) {
        it("[sync]  " + t.blockNumber + " -> " + t.blockHash, function () {
          this.timeout(TIMEOUT);
          asserts(t, rpc.getBlock(t.blockNumber));
        });
        it("[async] " + t.blockNumber + " -> " + t.blockHash, function (done) {
          this.timeout(TIMEOUT);
          rpc.getBlock(t.blockNumber, true, function (block) {
            asserts(t, block);
            done();
          });
        });
      };

      // expected block hashes for network 3
      test({
        blockNumber: "0x1",
        blockHash: "0x41800b5c3f1717687d85fc9018faac0a6e90b39deaa0b99e7fe4fe796ddeb26a"
      });
      test({
        blockNumber: "0x1b4",
        blockHash: "0x4a89e885e0a6cc17b78d790320833299b550d47c36287b0d8d4fda97684a777a"
      });
      test({
        blockNumber: "0x24f2",
        blockHash: "0xb834d7896445bafda400ae577c38e1085cf1e27b888e8f33a66a13b65120b027"
      });
    });

    describe("getBlockByHash", function () {
      var asserts = function (t, block) {
        assert.property(block, "number");
        assert.property(block, "parentHash");
        assert.property(block, "hash");
        assert.property(block, "nonce");
        assert.property(block, "sha3Uncles");
        assert.property(block, "logsBloom");
        assert.property(block, "transactionsRoot");
        assert.property(block, "stateRoot");
        assert.property(block, "miner");
        assert.property(block, "difficulty");
        assert.property(block, "totalDifficulty");
        assert.property(block, "size");
        assert.property(block, "extraData");
        assert.property(block, "gasLimit");
        assert.property(block, "gasUsed");
        assert.property(block, "timestamp");
        assert.property(block, "transactions");
        assert.property(block, "uncles");
        assert.isAbove(parseInt(block.number), 0);
        assert.isAbove(parseInt(block.hash), 0);
        assert.isAbove(parseInt(block.parentHash), 0);
        assert.isAbove(parseInt(block.nonce), 0);
        assert.isAbove(parseInt(block.sha3Uncles), 0);
        assert.isAbove(parseInt(block.transactionsRoot), 0);
        assert.isAbove(parseInt(block.stateRoot), 0);
        assert.isAbove(parseInt(block.miner), 0);
        assert.isAbove(parseInt(block.difficulty), 0);
        assert.isAbove(parseInt(block.totalDifficulty), 0);
        assert.isAbove(parseInt(block.gasLimit), 0);
        assert.isAbove(parseInt(block.timestamp), 0);
        assert.isAbove(parseInt(block.number), 0);
        assert.isArray(block.transactions);
        assert.isArray(block.uncles);
        assert.strictEqual(parseInt(block.number), parseInt(t.blockNumber));
        assert.strictEqual(block.hash, t.blockHash);
      };
      var test = function (t) {
        it("[sync]  " + t.blockHash + " -> " + t.blockNumber, function () {
          this.timeout(TIMEOUT);
          asserts(t, rpc.getBlockByHash(t.blockHash));
        });
        it("[async] " + t.blockHash + " -> " + t.blockNumber, function (done) {
          this.timeout(TIMEOUT);
          rpc.getBlockByHash(t.blockHash, true, function (block) {
            asserts(t, block);
            done();
          });
        });
      };
      test({
        blockNumber: "0x1",
        blockHash: "0x41800b5c3f1717687d85fc9018faac0a6e90b39deaa0b99e7fe4fe796ddeb26a"
      });
      test({
        blockNumber: "0x1b4",
        blockHash: "0x4a89e885e0a6cc17b78d790320833299b550d47c36287b0d8d4fda97684a777a"
      });
      test({
        blockNumber: "0x24f2",
        blockHash: "0xb834d7896445bafda400ae577c38e1085cf1e27b888e8f33a66a13b65120b027"
      });
    });

    describe("invoke", function () {
      var encodedParams, returns;
      before(function () {
        encodedParams = "0x7a66d7ca"+
                "00000000000000000000000000000000000000000000000000000000000f69b5";
        returns = "number";
      });
      it("[sync] invoke == call == broadcast", function () {
        this.timeout(TIMEOUT);
        var invokeResult = rpc.invoke({
          to: contracts.Branches,
          from: COINBASE,
          method: "getVotePeriod",
          inputs: ["branch"],
          signature: ["int256"],
          returns: returns,
          params: "0xf69b5"
        });
        var callResult = rpc.call({
          from: COINBASE,
          to: contracts.Branches,
          data: encodedParams,
          returns: returns
        });
        var broadcastResult = rpc.broadcast({
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{
            from: COINBASE,
            to: contracts.Branches,
            data: encodedParams,
            returns: returns
          }, "latest"]
        });
        assert.strictEqual(invokeResult, callResult);
        assert.strictEqual(invokeResult, broadcastResult);
      });
      it("[async] invoke == call == broadcast", function (done) {
        this.timeout(TIMEOUT);
        rpc.invoke({
          to: contracts.Branches,
          from: COINBASE,
          method: "getVotePeriod",
          inputs: ["branch"],
          signature: ["int256"],
          returns: returns,
          params: "0xf69b5"
        }, function (invokeResult) {
          rpc.call({
            from: COINBASE,
            to: contracts.Branches,
            data: encodedParams,
            returns: returns
          }, function (callResult) {
            rpc.broadcast({
              id: ++requests,
              jsonrpc: "2.0",
              method: "eth_call",
              params: [{
                from: COINBASE,
                to: contracts.Branches,
                data: encodedParams,
                returns: returns
              }, "latest"]
            }, function (broadcastResult) {
              assert.strictEqual(invokeResult, callResult);
              assert.strictEqual(invokeResult, broadcastResult);
              done();
            }); // broadcast
          }); // call
        }); // invoke
      });
      it("getBranches() -> hash[]", function (done) {
        var branches = rpc.applyReturns("hash[]", rpc.invoke({
          to: contracts.Branches,
          from: COINBASE,
          method: "getBranches"
        }));
        if (branches.error) return done(branches);
        assert.isArray(branches);
        assert.isAbove(branches.length, 0);
        rpc.invoke({
          to: contracts.Branches,
          from: COINBASE,
          method: "getBranches"
        }, function (res) {
          if (res.error) return done(res);
          res = rpc.applyReturns("hash[]", res);
          assert.isArray(res);
          assert.isAbove(res.length, 0);
          done();
        });
      });
    });

    describe("useHostedNode", function () {
      it("switch to hosted node(s)", function () {
        rpc.reset();
        assert.isNull(rpc.nodes.local);
        rpc.setLocalNode("http://127.0.0.1:8545");
        assert.strictEqual(rpc.nodes.local, "http://127.0.0.1:8545");
        rpc.useHostedNode();
        assert.isNull(rpc.nodes.local);
      });
    });

    if (!wsUrl) {
      describe("setLocalNode", function () {
        after(function () { rpc.useHostedNode(); });
        var test = function (command) {
          it("[sync] " + JSON.stringify(command), function () {
            this.timeout(TIMEOUT);
            rpc.reset();
            rpc.setLocalNode("http://127.0.0.0");
            assert.strictEqual(rpc.nodes.local, "http://127.0.0.0");
            assert.deepEqual(rpc.nodes.hosted, HOSTED_NODES);
            assert.throws(function () { rpc.broadcast(command); }, Error, /410/);
          });
          it("[async] " + JSON.stringify(command), function (done) {
            this.timeout(TIMEOUT);
            rpc.reset();
            rpc.setLocalNode("http://127.0.0.0");
            assert.strictEqual(rpc.nodes.local, "http://127.0.0.0");
            assert.deepEqual(rpc.nodes.hosted, HOSTED_NODES);
            rpc.broadcast(command, function (err) {
              console.log("command:", command);
              console.log("err:", err);
              assert.isNotNull(err);
              assert.property(err, "error");
              assert.property(err, "message");
              assert.strictEqual(err.error, 410);
              done();
            });
          });
        };
        test({
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_coinbase",
          params: []
        });
        test({
          id: ++requests,
          jsonrpc: "2.0",
          method: "net_version",
          params: []
        });
        test({
          id: ++requests,
          jsonrpc: "2.0",
          method: "eth_gasPrice",
          params: []
        });
      });
    }

    describe("errorCodes", function () {
      var test = function (t) {
        it(t.itx.method, function () {
          var actual = rpc.errorCodes(t.itx.method, t.itx.returns, t.response);
          assert.strictEqual(actual, t.expected);
        });
      };
      test({
        itx: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: "0xf69b5",
          returns: "number"
        },
        response: "1",
        expected: "1"
      });
    });

    describe("applyReturns", function () {
      var test = function (t) {
        it(t.result + "," + t.returns + " -> " + t.expected, function () {
          var actual = rpc.applyReturns(t.returns, t.result);
          assert.strictEqual(actual, t.expected);
        });
      };
      test({
        result: "1",
        returns: "number",
        expected: "1"
      });
    });

    describe("fire", function () {
      var test = function (t) {
        it(JSON.stringify(t.payload), function (done) {
          this.timeout(TIMEOUT);
          rpc.fire(t.payload, function (res) {
            assert.strictEqual(res, t.expected);
            done();
          }, t.wrapper, t.aux);
        });
      };
      test({
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: "0xf69b5",
          returns: "int"
        },
        expected: 1
      });
      test({
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: "0xf69b5",
          returns: "int"
        },
        wrapper: function (x) { return 2*x; },
        expected: 2
      });
      test({
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: "0xf69b5",
          returns: "int"
        },
        wrapper: function (x, aux) { return aux*x; },
        aux: 5,
        expected: 5
      });
    });

    describe("checkBlockHash", function () {
      var test = function (t) {
        beforeEach(function () {
          rpc.txs = {};
          rpc.rawTxs = {};
        });
        it(JSON.stringify(t), function (done) {
          this.timeout(TIMEOUT);
          rpc.txs[t.tx.hash] = {
            hash: t.tx.hash,
            payload: t.payload,
            count: t.count,
            status: "pending"
          };
          rpc.checkBlockHash(t.tx, null, function (err, res) {
            assert.strictEqual(rpc.txs[t.tx.hash].count, t.count + 1);
            assert.strictEqual(rpc.txs[t.tx.hash].status, t.expected);
            switch (t.expected) {
              case "mined":
                assert.isAbove(parseInt(res.blockHash, 16), 0);
                assert.isAbove(parseInt(res.blockNumber, 16), 0);
                assert.strictEqual(abi.encode(t.payload), res.input);
                assert.isAtMost(rpc.txs[t.tx.hash].count, rpc.TX_POLL_MAX);
                break;
              case "confirmed":
                assert.isNull(err);
                assert.isAbove(parseInt(res.blockHash, 16), 0);
                assert.isAbove(parseInt(res.blockNumber, 16), 0);
                assert.strictEqual(abi.encode(t.payload), res.input);
                assert.isAtMost(rpc.txs[t.tx.hash].count, rpc.TX_POLL_MAX);
                break;
              case "unconfirmed":
                assert.isUndefined(res);
                assert.deepEqual(err, errors.TRANSACTION_NOT_CONFIRMED);
                assert.isAtLeast(rpc.txs[t.tx.hash].count, rpc.TX_POLL_MAX);
                break;
              case "pending":
                assert.isNull(err);
                assert.isNull(res);
                assert.isBelow(rpc.txs[t.tx.hash].count, rpc.TX_POLL_MAX);
                break;
              default:
                return done(new Error("unexpected status"));
            }
            done();
          });
        });
        it("[sync] " + JSON.stringify(t), function () {
          this.timeout(TIMEOUT);
          rpc.txs[t.tx.hash] = {
            hash: t.tx.hash,
            payload: t.payload,
            count: t.count,
            status: "pending"
          };
          if (t.expected === "unconfirmed") {
            assert.throws(function () { rpc.checkBlockHash(t.tx); }, rpc.Error);
          } else {
            var res = rpc.checkBlockHash(t.tx);
            assert.strictEqual(rpc.txs[t.tx.hash].count, t.count + 1);
            assert.strictEqual(rpc.txs[t.tx.hash].status, t.expected);
            switch (t.expected) {
              case "mined":
                assert.isAbove(parseInt(res.blockHash, 16), 0);
                assert.isAbove(parseInt(res.blockNumber, 16), 0);
                assert.strictEqual(abi.encode(t.payload), res.input);
                assert.isAtMost(rpc.txs[t.tx.hash].count, rpc.TX_POLL_MAX);
                break;
              case "confirmed":
                assert.isAbove(parseInt(res.blockHash, 16), 0);
                assert.isAbove(parseInt(res.blockNumber, 16), 0);
                assert.strictEqual(abi.encode(t.payload), res.input);
                assert.isAtMost(rpc.txs[t.tx.hash].count, rpc.TX_POLL_MAX);
                break;
              case "pending":
                assert.isNull(res);
                assert.isBelow(rpc.txs[t.tx.hash].count, rpc.TX_POLL_MAX);
                break;
              default:
                throw new Error("unexpected status");
            }
          }
        });
      };
      test({
        tx: {
          nonce: "0xf23",
          blockHash: "0x043d7f980beb3c59b3335d90c4b14794f4577a71ff591c80858fac8a2f99dc39",
          blockNumber: "0x2f336",
          transactionIndex: "0x0",
          from: COINBASE,
          to: contracts.Faucets,
          value: "0x0",
          gas: "0x2fd618",
          gasPrice: "0xba43b7400",
          input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
          hash: TXHASH
        },
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: ["0xf69b5"],
          returns: "number"
        },
        count: 0,
        expected: "mined"
      });
      test({
        tx: {
          nonce: "0xf23",
          blockHash: "0x0",
          blockNumber: "0x0",
          transactionIndex: "0x0",
          from: COINBASE,
          to: contracts.Faucets,
          value: "0x0",
          gas: "0x2fd618",
          gasPrice: "0xba43b7400",
          input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
          hash: TXHASH
        },
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: ["0xf69b5"],
          returns: "number"
        },
        count: 0,
        expected: "pending"
      });
      test({
        tx: {
          nonce: "0xf23",
          blockHash: "0x043d7f980beb3c59b3335d90c4b14794f4577a71ff591c80858fac8a2f99dc39",
          blockNumber: "0x2f336",
          transactionIndex: "0x0",
          from: COINBASE,
          to: contracts.Faucets,
          value: "0x0",
          gas: "0x2fd618",
          gasPrice: "0xba43b7400",
          input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
          hash: TXHASH
        },
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: ["0xf69b5"],
          returns: "number"
        },
        count: rpc.TX_POLL_MAX - 1,
        expected: "mined"
      });
      test({
        tx: {
          nonce: "0xf23",
          blockHash: "0x0",
          blockNumber: "0x0",
          transactionIndex: "0x0",
          from: COINBASE,
          to: contracts.Faucets,
          value: "0x0",
          gas: "0x2fd618",
          gasPrice: "0xba43b7400",
          input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
          hash: TXHASH
        },
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: ["0xf69b5"],
          returns: "number"
        },
        count: rpc.TX_POLL_MAX - 2,
        expected: "pending"
      });
      test({
        tx: {
          nonce: "0xf23",
          blockHash: "0x0",
          blockNumber: "0x0",
          transactionIndex: "0x0",
          from: COINBASE,
          to: contracts.Faucets,
          value: "0x0",
          gas: "0x2fd618",
          gasPrice: "0xba43b7400",
          input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
          hash: TXHASH
        },
        payload: {
          to: contracts.Faucets,
          from: COINBASE,
          method: "reputationFaucet",
          inputs: ["branch"],
          signature: ["int256"],
          params: ["0xf69b5"],
          returns: "number"
        },
        count: rpc.TX_POLL_MAX,
        expected: "unconfirmed"
      });
    });

    describe("getLoggedReturnValue", function () {
      var test = function (t) {
        var getTransactionReceipt;
        before(function () {
          getTransactionReceipt = rpc.getTransactionReceipt;
        });
        after(function () {
          rpc.getTransactionReceipt = getTransactionReceipt;
        });
        it(JSON.stringify(t), function (done) {
          rpc.getTransactionReceipt = function (txHash, callback) {
            return callback(t.receipt);
          };
          rpc.getLoggedReturnValue(t.txHash, function (err, log) {
            if (t.receipt.logs.length) {
              assert.isNull(err);
              assert.strictEqual(log.returnValue, t.receipt.logs[0].data);
            } else {
              assert.isUndefined(log);
              assert.deepEqual(err, errors.NULL_CALL_RETURN);
            }
            done();
          });
        });
        it("[sync] " + JSON.stringify(t), function () {
          rpc.getTransactionReceipt = function (txHash, callback) {
            return t.receipt;
          };
          if (!t.receipt.logs.length) {
            assert.throws(function () { rpc.getLoggedReturnValue(t.txHash); }, rpc.Error);
          } else {
            var loggedReturnValue = rpc.getLoggedReturnValue(t.txHash).returnValue;
            assert.strictEqual(loggedReturnValue, t.receipt.logs[0].data);
          }
        });
      };
      test({
        txHash: "0x5026ed5250f2362af5a8d87c9cb0cf2aec3133451fbcb381b8215d338b2c8bd6",
        receipt: {
          blockHash: "0x520cbbffb517fb67703334f146a80948d0ced650432176ec2fb89f3e5ade0429",
          blockNumber: "0x1362b4",
          contractAddress: null,
          cumulativeGasUsed: "0x10ad59",
          from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
          gasUsed: "0x10ad59",
          logs: [{
            address: "0x854cde0fd53ae086342605dbf59a5b2632970fb2",
            blockHash: "0x520cbbffb517fb67703334f146a80948d0ced650432176ec2fb89f3e5ade0429",
            blockNumber: "0x1362b4",
            data: "0x4029a41614f26640bffa5eb5f817c85d0320c673f873839edb6830aa611b12b2",
            logIndex: "0x0",
            topics: ["0x63f140d7adcc464732c9379020aa9e5ce1b1e350796814d780ea3ca41d62a36b"],
            transactionHash: "0x5026ed5250f2362af5a8d87c9cb0cf2aec3133451fbcb381b8215d338b2c8bd6",
            transactionIndex: "0x0"
          }],
          root: "f25d798e248c5c9f70f9e643a7d6a34443a349f141c76cf85c0258d88f0e4089",
          to: "0x854cde0fd53ae086342605dbf59a5b2632970fb2",
          transactionHash: "0x5026ed5250f2362af5a8d87c9cb0cf2aec3133451fbcb381b8215d338b2c8bd6",
          transactionIndex: "0x0"
        },
        expected: "0x4029a41614f26640bffa5eb5f817c85d0320c673f873839edb6830aa611b12b2"
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        receipt: {
          blockHash: "0x8a022646e5b42a468bc96c71775c870a3be73feae6688b955e4f66010949a1e8",
          blockNumber: "0x136362",
          contractAddress: null,
          cumulativeGasUsed: "0x438af",
          from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
          gasUsed: "0xfb64",
          logs: [],
          root: "73c2dee8a7d64833e0c10db6ddf81dcb67ae13fdf201a6799340eeaca3dc37f1",
          to: "0xf3315a83f8b53fd199e16503f4b905716af4751f",
          transactionHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
          transactionIndex: "0x1"
        },
        expected: errors.NULL_CALL_RETURN
      });
    });

    describe("txNotify", function () {
      var test = function (t) {
        var getTransaction;
        before(function () {
          getTransaction = rpc.getTransaction;
        });
        beforeEach(function () {
          rpc.txs = {};
          rpc.rawTxs = {};
        });
        after(function () {
          rpc.getTransaction = getTransaction;
        });
        it(JSON.stringify(t), function (done) {
          rpc.getTransaction = function (txHash, callback) {
            return callback(t.tx);
          };
          rpc.txs[t.txHash] = {status: "pending"};
          rpc.rawTxs = clone(t.rawTxs);
          rpc.txNotify(t.txHash, function (err, tx) {
            assert.strictEqual(rpc.txs[t.txHash].status, t.expected);
            switch (t.expected) {
              case "pending":
                assert.isNull(err);
                assert.deepEqual(tx, t.tx);
                break;
              case "failed":
                assert.isUndefined(tx);
                assert.deepEqual(err, errors.TRANSACTION_NOT_FOUND);
                break;
              case "resubmitted":
                assert.isNull(err);
                assert.isNull(tx);
                break;
              default:
                return done(new Error("unexpected status"));
            }
            done();
          });
        });
        it("[sync] " + JSON.stringify(t), function () {
          rpc.getTransaction = function (txHash, callback) {
            return t.tx;
          };
          rpc.txs[t.txHash] = {status: "pending"};
          rpc.rawTxs = clone(t.rawTxs);
          if (t.expected === "failed") {
            assert.throws(function () { rpc.txNotify(t.txHash); }, rpc.Error);
          } else {
            var tx = rpc.txNotify(t.txHash);
            assert.strictEqual(rpc.txs[t.txHash].status, t.expected);
            switch (t.expected) {
              case "pending":
                assert.deepEqual(tx, t.tx);
                break;
              case "resubmitted":
                assert.isNull(tx);
                break;
              default:
                throw new Error("unexpected status");
            }
          }
        });
      };
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: {
          blockHash: "0x8a022646e5b42a468bc96c71775c870a3be73feae6688b955e4f66010949a1e8",
          blockNumber: "0x136362",
          from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
          gas: "0x2fd618",
          gasPrice: "0x4a817c800",
          hash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
          input: "0x5f92896e00000000000000000000000000000000000000000000000000000000000f69b5",
          nonce: "0x11c334",
          to: "0xf3315a83f8b53fd199e16503f4b905716af4751f",
          transactionIndex: "0x1",
          value: "0x0"
        },
        rawTxs: {},
        expected: "pending"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: {
          blockHash: "0x0bc730af2bae2ab7e0d6d7f8a71a0e6ae5e7706d9872806f5367ffc5936fb4df",
          blockNumber: "0x1362ae",
          from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
          gas: "0x2fd618",
          gasPrice: "0x4a817c800",
          hash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
          input: "0x47c7ea4200000000000000000000000000000000000000000000000000000000000f69b500000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000613800740000000000000000000000000000000000000000000001a500000000000000000000000000000000000000000000000000000000000001c9000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000051eb851eb851eb86261736866756c00000000000000000000000000000000000000000000000000736c6f7065730000000000000000000000000000000000000000000000000000696e64656e7400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000246c696768742d686561727465642d64697374726573732d71333170356e653770686b743900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f7361696c2e6c616e7465726e2e757300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027576573742041626469656c2073656c656374696e672070757a7a6c6564206672696374696f6e2100000000000000000000000000000000000000000000000000",
          nonce: "0x11c320",
          to: "0x854cde0fd53ae086342605dbf59a5b2632970fb2",
          transactionIndex: "0x0",
          value: "0x78cad1e25d0000"
        },
        rawTxs: {},
        expected: "pending"
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: {
          blockHash: "0x0",
          blockNumber: "0x0",
          from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
          gas: "0x2fd618",
          gasPrice: "0x4a817c800",
          hash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
          input: "0x5f92896e00000000000000000000000000000000000000000000000000000000000f69b5",
          nonce: "0x11c334",
          to: "0xf3315a83f8b53fd199e16503f4b905716af4751f",
          transactionIndex: "0x1",
          value: "0x0"
        },
        rawTxs: {},
        expected: "pending"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: null,
        rawTxs: {},
        expected: "failed"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: null,
        rawTxs: {
          "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08": {
            tx: null
          }
        },
        expected: "failed"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: null,
        rawTxs: {
          "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08": {
            tx: {nonce: "0x11c334", from: "0x854cde0fd53ae086342605dbf59a5b2632970fb2"}
          }
        },
        expected: "failed"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: null,
        rawTxs: {
          "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08": {
            tx: {nonce: "0x11c334", from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c"}
          }
        },
        expected: "failed"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: null,
        rawTxs: {
          "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08": {
            tx: {nonce: "0x11c334", from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c"}
          },
          "0x520cbbffb517fb67703334f146a80948d0ced650432176ec2fb89f3e5ade0429": {
            tx: {nonce: "0x11c334", from: "0x854cde0fd53ae086342605dbf59a5b2632970fb2"}
          }
        },
        expected: "resubmitted"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: null,
        rawTxs: {
          "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08": {
            tx: {nonce: "0x11c334", from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c"}
          },
          "0x520cbbffb517fb67703334f146a80948d0ced650432176ec2fb89f3e5ade0429": {
            tx: {nonce: "0x11c335", from: "0x854cde0fd53ae086342605dbf59a5b2632970fb2"}
          }
        },
        expected: "failed"
      });
      test({
        txHash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: null,
        rawTxs: {
          "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08": {
            tx: {nonce: "0x11c335", from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c"}
          },
          "0x520cbbffb517fb67703334f146a80948d0ced650432176ec2fb89f3e5ade0429": {
            tx: {nonce: "0x11c334", from: "0x854cde0fd53ae086342605dbf59a5b2632970fb2"}
          }
        },
        expected: "failed"
      });
    });

    describe("verifyTxSubmitted", function () {
      var test = function (t) {
        var getTransaction;
        var updateTx;
        var rpcBlockNumber;
        before(function () {
          getTransaction = rpc.getTransaction;
          updateTx = rpc.updateTx;
          rpcBlockNumber = rpc.blockNumber;
        });
        beforeEach(function () {
          rpc.txs = {};
          rpc.rawTxs = {};
        });
        after(function () {
          rpc.getTransaction = getTransaction;
          rpc.updateTx = updateTx;
          rpc.blockNumber = rpcBlockNumber;
        });
        it(JSON.stringify(t), function (done) {
          rpc.blockNumber = function (callback) {
            return callback("0x9");
          }
          rpc.updateTx = function (tx) {
            rpc.txs[t.hash].tx = t.tx;
          };
          if (t.expected.storedTx) {
            t.expected.storedTx.count = 0;
            t.expected.storedTx.status = "pending";
            t.expected.tx = clone(t.tx);
          }
          rpc.txs[t.hash] = clone(t.storedTx);
          rpc.verifyTxSubmitted(t.payload, t.hash, t.callReturn, t.onSent, t.onSuccess, t.onFailed, function (err) {
            assert.deepEqual(err, t.expected.err);
            if (rpc.txs[t.hash]) {
              delete rpc.txs[t.hash].onSent;
              delete rpc.txs[t.hash].onFailed;
              delete rpc.txs[t.hash].onSuccess;
            }
            assert.deepEqual(rpc.txs[t.hash], t.expected.storedTx);
            done();
          });
        });
        it("[sync] " + JSON.stringify(t), function () {
          rpc.getTransaction = function (hash, callback) {
            return t.tx;
          };
          if (t.expected.storedTx) {
            t.expected.storedTx.count = 0;
            t.expected.storedTx.status = "pending";
            t.expected.tx = clone(t.tx);
          }
          rpc.txs[t.hash] = clone(t.storedTx);
          if (t.expected.err) {
            assert.throws(function () {
              rpc.verifyTxSubmitted(t.payload, t.hash, t.callReturn);
            }, rpc.Error);
          } else {
            rpc.verifyTxSubmitted(t.payload, t.hash, t.callReturn);
            assert.deepEqual(rpc.txs[t.hash], t.expected.storedTx);
          }
        });
      };
      test({
        payload: null,
        hash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: {nonce: "0x1"},
        storedTx: undefined,
        callReturn: "1",
        expected: {
          err: errors.TRANSACTION_FAILED,
          storedTx: undefined
        }
      });
      test({
        payload: {nonce: "0x1"},
        hash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: {nonce: "0x1"},
        storedTx: {payload: {nonce: "0x1"}, count: 0, status: "pending"},
        callReturn: "1",
        expected: {
          err: errors.DUPLICATE_TRANSACTION,
          storedTx: {payload: {nonce: "0x1"}}
        }
      });
      test({
        payload: {nonce: "0x1"},
        hash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: {nonce: "0x2"},
        storedTx: {payload: {nonce: "0x3"}, count: 0, status: "pending"},
        callReturn: "1",
        expected: {
          err: errors.DUPLICATE_TRANSACTION,
          storedTx: {payload: {nonce: "0x3"}}
        }
      });
      test({
        payload: {nonce: "0x1"},
        hash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
        tx: {nonce: "0x2"},
        storedTx: undefined,
        callReturn: "1",
        expected: {
          err: null,
          storedTx: {
            hash: "0x3eac75fab91ae9c9222f7a2ea041cb8ec3de48060d99c5b25045fc7ea609fc08",
            payload: {nonce: "0x1"},
            callReturn: "1",
            tx: {nonce: "0x2"}
          }
        }
      });
    });

    describe("pollForTxConfirmation", function () {
      var test = function (t) {
        var txNotify, checkBlockHash;
        before(function () {
          txNotify = rpc.txNotify;
          checkBlockHash = rpc.checkBlockHash;
        });
        after(function () {
          rpc.txNotify = txNotify;
          rpc.checkBlockHash = checkBlockHash;
        });
        it(JSON.stringify(t), function (done) {
          rpc.txNotify = function (txHash, callback) {
            return callback(t.err.txNotify, t.tx);
          };
          rpc.checkBlockHash = function (tx, numConfirmations, callback) {
            var minedTx = (t.err.checkBlockHash) ? undefined : tx;
            return callback(t.err.checkBlockHash, minedTx);
          };
          rpc.pollForTxConfirmation(t.txHash, null, function (err, minedTx) {
            if (t.err.txNotify) {
              assert.deepEqual(err, t.err.txNotify);
              assert.isUndefined(minedTx);
            } else if (t.tx === null) {
              assert.isNull(err);
              assert.isNull(minedTx);
            } else if (t.err.checkBlockHash) {
              assert.deepEqual(err, t.err.checkBlockHash);
              assert.isUndefined(minedTx);
            } else {
              assert.isNull(err);
              assert.deepEqual(minedTx, t.tx);
            }
            assert.deepEqual(err, t.expected.err);
            assert.deepEqual(minedTx, t.expected.minedTx);
            done();
          });
        });
        it("[sync] " + JSON.stringify(t), function () {
          rpc.txNotify = function (txHash, callback) {
            if (t.err.txNotify) throw new rpc.Error(t.err.txNotify);
            return t.tx;
          };
          rpc.checkBlockHash = function (tx, callback) {
            if (t.err.checkBlockHash) throw new rpc.Error(t.err.checkBlockHash);
            var minedTx = (t.err.checkBlockHash) ? undefined : tx;
            return minedTx;
          };
          if (t.err.txNotify || (t.tx && t.err.checkBlockHash)) {
            assert.throws(function () {
              rpc.pollForTxConfirmation(t.txHash);
            }, rpc.Error);
          } else {
            var minedTx = rpc.pollForTxConfirmation(t.txHash);
            if (t.tx === null) {
              assert.isNull(minedTx);
            } else {
              assert.deepEqual(minedTx, t.tx);
            }
            assert.deepEqual(minedTx, t.expected.minedTx);
          }
        });
      };
      var exampleTx = {
        blockHash: "0x520cbbffb517fb67703334f146a80948d0ced650432176ec2fb89f3e5ade0429",
        blockNumber: "0x1362b4",
        from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
        gas: "0x2fd618",
        gasPrice: "0x4a817c800",
        hash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        input: "0x5f92896e00000000000000000000000000000000000000000000000000000000000f69b5",
        nonce: "0x11c334",
        to: "0xf3315a83f8b53fd199e16503f4b905716af4751f",
        transactionIndex: "0x1",
        value: "0x0"
      };
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: exampleTx,
        err: {
          txNotify: null,
          checkBlockHash: null
        },
        expected: {
          err: null,
          minedTx: exampleTx
        }
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: exampleTx,
        err: {
          txNotify: errors.TRANSACTION_NOT_FOUND,
          checkBlockHash: null
        },
        expected: {
          err: errors.TRANSACTION_NOT_FOUND,
          minedTx: undefined
        }
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: exampleTx,
        err: {
          txNotify: null,
          checkBlockHash: errors.TRANSACTION_NOT_CONFIRMED
        },
        expected: {
          err: errors.TRANSACTION_NOT_CONFIRMED,
          minedTx: undefined
        }
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: exampleTx,
        err: {
          txNotify: errors.TRANSACTION_NOT_FOUND,
          checkBlockHash: errors.TRANSACTION_NOT_CONFIRMED
        },
        expected: {
          err: errors.TRANSACTION_NOT_FOUND,
          minedTx: undefined
        }
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: null,
        err: {
          txNotify: errors.TRANSACTION_NOT_FOUND,
          checkBlockHash: errors.TRANSACTION_NOT_CONFIRMED
        },
        expected: {
          err: errors.TRANSACTION_NOT_FOUND,
          minedTx: undefined
        }
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: null,
        err: {
          txNotify: null,
          checkBlockHash: errors.TRANSACTION_NOT_CONFIRMED
        },
        expected: {
          err: null,
          minedTx: null
        }
      });
      test({
        txHash: "0x47e13568f70785d12e42dec9a3884b7202c707186d5714d9bd426ab69679d6e2",
        tx: null,
        err: {
          txNotify: null,
          checkBlockHash: null
        },
        expected: {
          err: null,
          minedTx: null
        }
      });
    });
  }

  describe("HTTP", function () { runtests(); });
  describe("WebSocket", function () { runtests("wss://ws.augur.net"); });

});
