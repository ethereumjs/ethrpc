/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var longjohn = require("longjohn");
var contracts = require("augur-contracts")['7'];
var errors = require("../errors");
var rpc = require("../");

require('it-each')({ testPerIteration: true });

longjohn.async_trace_limit = 25;
longjohn.empty_frame = "";

rpc.bignumbers = false;

var TIMEOUT = 120000;
var COINBASE = "0xaff9cb4dcb19d13b84761c040c91d21dc6c991ec";
var SHA3_INPUT = "boom!";
var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
var PROTOCOL_VERSION = "61";

var requests = 0;
var DEFAULT_NODES = [
    "http://eth3.augur.net",
    "http://eth1.augur.net",
    "http://eth4.augur.net",
    "http://eth5.augur.net"
];

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
                done(response);
            } else {
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
            }
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
        node: "http://eth1.augur.net",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_coinbase",
            params: []
        },
        expected: COINBASE
    });
    test({
        node: "http://eth1.augur.net",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "web3_sha3",
            params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
    });
    test({
        node: "http://eth1.augur.net",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "net_listening",
            params: []
        },
        expected: true
    });
    test({
        node: "http://eth1.augur.net",
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
        node: "http://eth1.augur.net",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_coinbase",
            params: []
        },
        expected: COINBASE
    });
    test({
        node: "http://eth1.augur.net",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "web3_sha3",
            params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
    });
    test({
        node: "http://eth1.augur.net",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "net_listening",
            params: []
        },
        expected: true
    });
    test({
        node: "http://eth1.augur.net",
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
            rpc.nodes = [t.node];
            assert.strictEqual(rpc.listening(), t.listening);
            rpc.listening(function (listening) {
                assert.strictEqual(listening, t.listening);
                done();
            });
        });
    };

    test({
        node: "http://eth1.augur.net",
        listening: true
    });
    test({
        node: "http://eth1.augur.net:8545",
        listening: true
    });
    test({
        node: "http://eth3.augur.net",
        listening: true
    });
    test({
        node: "http://eth3.augur.net:8545",
        listening: true
    });
    test({
        node: "http://eth4.augur.net",
        listening: true
    });
    test({
        node: "http://eth4.augur.net:8545",
        listening: true
    });
    test({
        node: "http://eth5.augur.net",
        listening: true
    });
    test({
        node: "http://eth5.augur.net:8545",
        listening: true
    });
    test({
        node: "",
        listening: false
    });
    test({
        node: null,
        listening: false
    });
    test({
        node: undefined,
        listening: false
    });
    test({
        node: NaN,
        listening: false
    });

});

describe("version (network ID)", function () {

    var test = function (t) {
        it(t.node + " -> " + t.version, function (done) {
            this.timeout(TIMEOUT);
            rpc.nodes = [t.node];
            assert.strictEqual(rpc.version(), t.version);
            rpc.version(function (version) {
                assert.strictEqual(version, t.version);
                done();
            });
        });
    };

    test({
        node: "http://eth1.augur.net",
        version: "7"
    });
    test({
        node: "http://eth1.augur.net:8545",
        version: "7"
    });
    test({
        node: "http://eth3.augur.net",
        version: "7"
    });
    test({
        node: "http://eth3.augur.net:8545",
        version: "7"
    });
    test({
        node: "http://eth4.augur.net",
        version: "7"
    });
    test({
        node: "http://eth4.augur.net:8545",
        version: "7"
    });
    test({
        node: "http://eth5.augur.net",
        version: "7"
    });
    test({
        node: "http://eth5.augur.net:8545",
        version: "7"
    });

});

describe("unlocked", function () {

    var test = function (t) {
        it(t.node + " -> " + t.unlocked, function () {
            rpc.nodes = [t.node];
            assert.strictEqual(rpc.unlocked(t.account), t.unlocked);
        });
    };

    test({
        node: "http://eth1.augur.net",
        unlocked: true
    });
    test({
        node: "http://eth1.augur.net",
        account: COINBASE,
        unlocked: true
    });
    test({
        node: "http://eth1.augur.net:8545",
        unlocked: true
    });
    test({
        node: "http://eth1.augur.net:8545",
        account: COINBASE,
        unlocked: true
    });
    test({
        node: "http://eth3.augur.net",
        unlocked: true
    });
    test({
        node: "http://eth3.augur.net",
        account: COINBASE,
        unlocked: true
    });
    test({
        node: "http://eth3.augur.net:8545",
        unlocked: true
    });
    test({
        node: "http://eth3.augur.net:8545",
        account: COINBASE,
        unlocked: true
    });
    test({
        node: "http://eth4.augur.net",
        unlocked: false
    });
    test({
        node: "http://eth4.augur.net",
        account: COINBASE,
        unlocked: false
    });
    test({
        node: "http://eth4.augur.net:8545",
        unlocked: false
    });
    test({
        node: "http://eth4.augur.net:8545",
        account: COINBASE,
        unlocked: false
    });
    test({
        node: "http://eth5.augur.net",
        unlocked: false
    });
    test({
        node: "http://eth5.augur.net",
        account: COINBASE,
        unlocked: false
    });
    test({
        node: "http://eth5.augur.net:8545",
        unlocked: false
    });
    test({
        node: "http://eth5.augur.net:8545",
        account: COINBASE,
        unlocked: false
    });
    test({
        node: null,
        unlocked: false
    });
    test({
        node: null,
        account: COINBASE,
        unlocked: false
    });
    test({
        node: undefined,
        unlocked: false
    });
    test({
        node: undefined,
        account: COINBASE,
        unlocked: false
    });
    test({
        node: NaN,
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
        assert.strictEqual(res.length, 2);
        assert(parseInt(res[0]) === 1 || parseInt(res[0]) === -1);
        assert(parseInt(res[1]) === 1 || parseInt(res[1]) === -1);
    };

    var txList = [{
        to: contracts.faucets,
        method: "cashFaucet",
        returns: "number",
        send: false
    }, {
        to: contracts.faucets,
        method: "reputationFaucet",
        signature: "i",
        params: "0xf69b5",
        returns: "number",
        send: false
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

describe("multicast", function () {

    var command = {
        id: ++requests,
        jsonrpc: "2.0",
        method: "eth_protocolVersion",
        params: []
    };

    rpc.reset();

    it.each(
        rpc.nodes,
        "[sync] post " + command.method + " RPC to %s",
        ["element"],
        function (element, next) {
            this.timeout(TIMEOUT);
            assert.strictEqual(rpc.postSync(element, command), PROTOCOL_VERSION);
            next();
        }
    );

    it.each(
        rpc.nodes,
        "[async] post " + command.method + " RPC to %s",
        ["element"],
        function (element, next) {
            this.timeout(TIMEOUT);
            rpc.post(element, command, null, function (response) {
                assert.strictEqual(response, PROTOCOL_VERSION);
                next();
            });
        }
    );

    it("call back after first asynchronous response", function (done) {
        this.timeout(TIMEOUT);
        rpc.broadcast(command, function (response) {
            assert.strictEqual(response, PROTOCOL_VERSION);
            done();
        });
    }); 

    it("return after first synchronous response", function (done) {
        assert.strictEqual(rpc.broadcast(command), PROTOCOL_VERSION);
        done();
    });

});

describe("reset", function () {

    it("revert to default node list", function () {
        rpc.nodes = ["http://eth0.augur.net"];
        assert.isArray(rpc.nodes);
        assert.strictEqual(rpc.nodes.length, 1);
        assert.strictEqual(rpc.nodes[0], "http://eth0.augur.net");
        rpc.reset();
        assert.isArray(rpc.nodes);
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, DEFAULT_NODES);
        rpc.reset();
        assert.isArray(rpc.nodes);
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, DEFAULT_NODES);
    });  

});

describe("Ethereum bindings", function () {

    it("raw('eth_coinbase')", function () {
        assert.strictEqual(rpc.raw("eth_coinbase"), COINBASE);
    });

    it("eth('coinbase')", function () {
        assert.strictEqual(COINBASE, rpc.eth("coinbase"));
    });

    it("eth('protocolVersion')", function () {
        assert.strictEqual(rpc.eth("protocolVersion"), "61");
    });

    it("web3_sha3('" + SHA3_INPUT + "')", function () {
        assert.strictEqual(rpc.web3("sha3", SHA3_INPUT), SHA3_DIGEST);
        assert.strictEqual(rpc.sha3(SHA3_INPUT), SHA3_DIGEST);
    });

    it("leveldb('putString')", function () {
        assert.isTrue(
            rpc.leveldb("putString", ["augur_test_DB", "boomkey", "boom!"])
        );
    });

    it("leveldb('getString')", function () {
        rpc.leveldb("putString", ["augur_test_DB", "boomkey", "boom!"]);
        assert.strictEqual(
            rpc.leveldb("getString", ["augur_test_DB", "boomkey"]), "boom!"
        );
    });

    it("gasPrice", function () {
        assert(parseInt(rpc.gasPrice()) >= 0);
    });

    it("blockNumber", function () {
        assert(parseFloat(rpc.blockNumber()) >= 0);
    });

    it("balance", function () {
        assert(parseInt(rpc.balance()) >= 0);
    });

    it("txCount", function () {
        assert(parseInt(rpc.txCount()) >= 0);
    });

    it("peerCount", function () {
        this.timeout(TIMEOUT);
        assert(parseInt(rpc.peerCount()) >= 0);
    });

    it("hashrate", function () {
        this.timeout(TIMEOUT);
        assert(parseInt(rpc.hashrate()) >= 0);
    });

    it("mining", function () {
        this.timeout(TIMEOUT);
        assert.isTrue(rpc.mining());
    });

    it("clientVersion", function () {
        this.timeout(TIMEOUT);
        var clientVersion = rpc.clientVersion();
        assert.isString(clientVersion);
        assert.strictEqual(clientVersion.split('/')[0], "Geth");
    });

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

    // expected block hashes for network 7
    test({
        blockNumber: "0x1",
        blockHash: "0x74aa258b2f71168b97d7d0c72ec8ff501ec15e4e2adc8c663a0f7b01a1025d88"
    });
    test({
        blockNumber: "0x1b4",
        blockHash: "0x721a93982fbbe858aa190476be937ea2052408d7f8ff6fb415cc969aaacaa045"
    });
    test({
        blockNumber: "0x24f2",
        blockHash: "0x9272764416f772a63b945e1c1c6ca449f8d07dc4378f6b589244b1f48fef86bf"
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
        blockHash: "0x74aa258b2f71168b97d7d0c72ec8ff501ec15e4e2adc8c663a0f7b01a1025d88",
        blockNumber: "0x1"
    });
    test({
        blockHash: "0x721a93982fbbe858aa190476be937ea2052408d7f8ff6fb415cc969aaacaa045",
        blockNumber: "0x1b4"
    });
    test({
        blockHash: "0x9272764416f772a63b945e1c1c6ca449f8d07dc4378f6b589244b1f48fef86bf",
        blockNumber: "0x24f2"
    });
});

describe("Contract methods", function () {

    var test = function (tx, expected, apply) {
        tx.send = false;
        if (tx && expected) {
            var res = rpc.invoke(tx);
            if (res) {
                if (apply) {
                    if (res && res.constructor === Array) {
                        assert.deepEqual(apply(res), apply(expected));
                    } else {
                        assert.strictEqual(apply(res), apply(expected));
                    }
                } else {
                    if (res && res.constructor === Array) {
                        assert.deepEqual(res, expected);
                    } else {
                        assert.strictEqual(res, expected);
                    }
                }
            } else {
                throw new Error("no or incorrect response: " + JSON.stringify(res));
            }
        }
    };

    var coinbase = rpc.coinbase();
    var encodedParams = "0x7a66d7ca"+
        "00000000000000000000000000000000000000000000000000000000000f69b5";
    var returns = "number";

    var cashFaucet = {
        to: contracts.faucets,
        from: COINBASE,
        method: "cashFaucet",
        send: false
    };

    it("[sync] invoke == call == broadcast", function () {
        this.timeout(TIMEOUT);
        var invokeResult = rpc.invoke({
            to: contracts.branches,
            from: coinbase,
            method: "getVotePeriod",
            signature: "i",
            returns: returns,
            params: "0x0f69b5"
        });
        var callResult = rpc.call({
            from: coinbase,
            to: contracts.branches,
            data: encodedParams,
            returns: returns
        });
        var broadcastResult = rpc.broadcast({
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_call",
            params: [{
                from: coinbase,
                to: contracts.branches,
                data: encodedParams,
                returns: returns
            }]
        });
        assert.strictEqual(invokeResult, callResult);
        assert.strictEqual(invokeResult, broadcastResult);
    });

    it("[async] invoke == call == broadcast", function (done) {
        this.timeout(TIMEOUT);
        rpc.invoke({
            to: contracts.branches,
            from: coinbase,
            method: "getVotePeriod",
            signature: "i",
            returns: returns,
            params: "0x0f69b5"
        }, function (invokeResult) {
            rpc.call({
                from: coinbase,
                to: contracts.branches,
                data: encodedParams,
                returns: returns
            }, function (callResult) {
                rpc.broadcast({
                    id: ++requests,
                    jsonrpc: "2.0",
                    method: "eth_call",
                    params: [{
                        from: coinbase,
                        to: contracts.branches,
                        data: encodedParams,
                        returns: returns
                    }]
                }, function (broadcastResult) {
                    assert.strictEqual(invokeResult, callResult);
                    assert.strictEqual(invokeResult, broadcastResult);
                    done();
                }); // broadcast
            }); // call
        }); // invoke
    });

    it("cashFaucet -> raw", function () {
        assert.include([
            "0x01",
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        ], rpc.invoke(cashFaucet));
    });

    it("cashFaucet -> number", function () {
        cashFaucet.returns = "number";
        assert.include(["1", "-1"], rpc.invoke(cashFaucet));
    });

    it("getMarkets(1010101) -> hash[]", function () {
        test({
            to: contracts.branches,
            from: COINBASE,
            method: "getMarkets",
            signature: "i",
            returns: "hash[]",
            params: 1010101
        }, ["0xe8", "0xe8"], function (a) {
            a.slice(1, 2);
        });
    });

});

describe("exciseNode", function () {

    it("remove node 2", function () {
        var nodes = DEFAULT_NODES.slice();
        rpc.reset();
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, nodes);
        rpc.exciseNode(null, nodes[2]);
        nodes.splice(2, 1);
        assert.strictEqual(rpc.nodes.length, 3);
        assert.deepEqual(rpc.nodes, nodes);
    });

    it("remove node 1 by index", function () {
        var nodes = DEFAULT_NODES.slice();
        rpc.reset();
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, nodes);
        rpc.exciseNode(null, null, 1);
        nodes.splice(1, 1);
        assert.strictEqual(rpc.nodes.length, 3);
        assert.deepEqual(rpc.nodes, nodes);
    });

    it("remove nodes 1 and 3", function () {
        var nodes = DEFAULT_NODES.slice();
        rpc.reset();
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, nodes);
        rpc.exciseNode(null, nodes[1]);
        rpc.exciseNode(null, nodes[3]);
        nodes.splice(3, 1);
        nodes.splice(1, 1);
        assert.strictEqual(rpc.nodes.length, 2);
        assert.deepEqual(rpc.nodes, nodes);
    });

    it("remove nodes 1 and 3 by index", function () {
        var nodes = DEFAULT_NODES.slice();
        rpc.reset();
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, nodes);
        rpc.exciseNode(null, null, 3);
        rpc.exciseNode(null, null, 1);
        nodes.splice(3, 1);
        nodes.splice(1, 1);
        assert.strictEqual(rpc.nodes.length, 2);
        assert.deepEqual(rpc.nodes, nodes);
    });

    it("remove nodes 1, 2 and 3", function () {
        var nodes = DEFAULT_NODES.slice();
        rpc.reset();
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, nodes);
        rpc.exciseNode(null, nodes[1]);
        rpc.exciseNode(null, nodes[2]);
        rpc.exciseNode(null, nodes[3]);
        nodes.splice(3, 1);
        nodes.splice(2, 1);
        nodes.splice(1, 1);
        assert.strictEqual(rpc.nodes.length, 1);
        assert.deepEqual(rpc.nodes, nodes);
    });

    it("reset if all nodes removed", function () {
        rpc.reset();
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, DEFAULT_NODES);
        rpc.exciseNode(null, DEFAULT_NODES[0]);
        rpc.exciseNode(null, DEFAULT_NODES[1]);
        rpc.exciseNode(null, DEFAULT_NODES[2]);
        rpc.exciseNode(null, DEFAULT_NODES[3]);
        assert.strictEqual(rpc.nodes.length, 4);
        assert.deepEqual(rpc.nodes, DEFAULT_NODES);
    });

});

describe("Backup nodes", function () {

    it("[sync] graceful failover to eth1.augur.net", function () {
        this.timeout(TIMEOUT);
        rpc.nodes = ["http://lol.lol.lol", "http://eth1.augur.net"];
        assert.strictEqual(rpc.nodes.length, 2);
        assert.strictEqual(rpc.version(), "7");
        assert.strictEqual(rpc.nodes.length, 1);
        assert.strictEqual(rpc.nodes[0], "http://eth1.augur.net");
    });

    it("[sync] graceful failover to eth[1,3,4].augur.net", function () {
        this.timeout(TIMEOUT);
        rpc.nodes = [
            "http://lol.lol.lol",
            "http://eth1.augur.net",
            "http://eth3.augur.net",
            "http://eth4.augur.net"
        ];
        assert.strictEqual(rpc.nodes.length, 4);
        assert.strictEqual(rpc.version(), "7");
        assert.strictEqual(rpc.nodes.length, 3);
        assert.strictEqual(rpc.nodes[0], "http://eth1.augur.net");
        assert.strictEqual(rpc.nodes[1], "http://eth3.augur.net");
        assert.strictEqual(rpc.nodes[2], "http://eth4.augur.net");
    });

    it("[async] graceful failover to eth1.augur.net", function (done) {
        this.timeout(TIMEOUT);
        rpc.nodes = ["http://lol.lol.lol", "http://eth1.augur.net"];
        assert.strictEqual(rpc.nodes.length, 2);
        rpc.version(function (version) {
            assert.strictEqual(version, "7");
            assert.strictEqual(rpc.nodes.length, 1);
            assert.strictEqual(rpc.nodes[0], "http://eth1.augur.net");
            done();
        });
    });

    it("[async] graceful failover to eth[1,3,4].augur.net", function (done) {
        this.timeout(TIMEOUT);
        rpc.nodes = [
            "http://lol.lol.lol",
            "http://eth1.augur.net",
            "http://eth3.augur.net",
            "http://eth4.augur.net"
        ];
        assert.strictEqual(rpc.nodes.length, 4);
        rpc.version(function (version) {
            assert.strictEqual(version, "7");
            assert.strictEqual(rpc.nodes.length, 3);
            assert.strictEqual(rpc.nodes[0], "http://eth1.augur.net");
            assert.strictEqual(rpc.nodes[1], "http://eth3.augur.net");
            assert.strictEqual(rpc.nodes[2], "http://eth4.augur.net");
            done();
        });
    });

    it("[sync] all nodes unresponsive", function () {
        rpc.nodes = ["http://lol.lol.lol", "http://not.a.node"];
        assert.strictEqual(rpc.nodes.length, 2);
        assert.strictEqual(rpc.version().error, errors.NO_RESPONSE.error);
        assert.strictEqual(rpc.nodes.length, 1);
        assert.strictEqual(rpc.nodes[0], "http://not.a.node");
    });

    it("[async] all nodes unresponsive", function (done) {
        this.timeout(TIMEOUT);
        rpc.nodes = ["http://lol.lol.lol", "http://not.a.node"];
        assert.strictEqual(rpc.nodes.length, 2);
        rpc.version(function (version) {
            assert.strictEqual(version.error, errors.NO_RESPONSE.error);
            assert.strictEqual(rpc.nodes.length, 4);
            assert.deepEqual(rpc.nodes, DEFAULT_NODES);
            done();
        });
    });

});
