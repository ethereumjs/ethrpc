/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var async = require("async");
var contracts = require("augur-contracts");
var errors = contracts.errors;
var abi = require("augur-abi");
var rpc = require("../");

require('it-each')({testPerIteration: true});

var requests = 0;
var TIMEOUT = 360000;
var SAMPLES = 25;
var COINBASE = "0x00bae5113ee9f252cceb0001205b88fad175461a";
var SHA3_INPUT = "boom!";
var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
var PROTOCOL_VERSION = "0x3f";
var TXHASH = "0xc52b258dec9e8374880b346f93669d7699d7e64d46c8b6072b19122ca9406461";
var NETWORK_ID = "2";
contracts = contracts[NETWORK_ID];
var HOSTED_NODES;

describe("wsConnect", function () {
    var test = function (t) {
        it(JSON.stringify(t), function (done) {
            rpc.wsUrl = t.wsUrl;
            rpc.wsStatus = t.wsStatus;
            rpc.wsConnect(function (connected) {
                assert.strictEqual(connected, t.expected.connected);
                assert.strictEqual(rpc.wsUrl, t.expected.wsUrl);
                assert.strictEqual(rpc.wsStatus, t.expected.wsStatus);
                if (connected) {
                    assert.strictEqual(rpc.websocket.readyState, rpc.websocket.OPEN);
                }
                done();
            });
        });
    };
    test({
        wsUrl: "wss://ws.augur.net",
        wsStatus: 0,
        expected: {
            connected: true,
            wsUrl: "wss://ws.augur.net",
            wsStatus: 1,
        }
    });
    test({
        wsUrl: "wss://ws.augur.net",
        wsStatus: -1,
        expected: {
            connected: true,
            wsUrl: "wss://ws.augur.net",
            wsStatus: 1,
        }
    });
    test({
        wsUrl: "ws://127.0.0.2:1212",
        wsStatus: 0,
        expected: {
            connected: false,
            wsUrl: null,
            wsStatus: -1
        }
    });
    test({
        wsUrl: "ws://127.0.0.2:1212",
        wsStatus: -1,
        expected: {
            connected: false,
            wsUrl: null,
            wsStatus: -1
        }
    });
    test({
        wsUrl: null,
        wsStatus: 0,
        expected: {
            connected: false,
            wsUrl: null,
            wsStatus: -1,
        }
    });
});

describe("wsSend", function () {
    afterEach(function () { 
        rpc.websocket.close();
        rpc.wsStatus = 0;
    });
    var test = function (t) {
        it(JSON.stringify(t), function (done) {
            rpc.wsUrl = "wss://ws.augur.net";
            rpc.wsStatus = 0;
            rpc.wsConnect(function (connected) {
                assert.isTrue(connected);
                assert.strictEqual(rpc.websocket.readyState, rpc.websocket.OPEN);
                var callback = function (res) {
                    assert.strictEqual(rpc.websocket.readyState, rpc.websocket.OPEN);
                    assert.isUndefined(rpc.wsRequests[t.command.id]);
                    assert.strictEqual(res, t.expected);
                    done();
                };
                rpc.wsSend(t.command, t.returns, callback);
                assert.isObject(rpc.wsRequests[t.command.id]);
                assert.strictEqual(rpc.wsRequests[t.command.id].returns, t.returns);
                assert.strictEqual(rpc.wsRequests[t.command.id].callback, callback);
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
        returns: "hash",
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
        returns: "hash",
        expected: PROTOCOL_VERSION
    });
});

describe("RPC", function () {

    function runtests(wsUrl) {

        before(function () {
            rpc.reset();
            rpc.balancer = false;
            rpc.ipcpath = null;
            rpc.excision = true;
            HOSTED_NODES = rpc.nodes.hosted.slice();
            rpc.wsUrl = wsUrl;
            if (!wsUrl) rpc.wsStatus = -1;
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
                assert.strictEqual(rpc.sha3(data.hex, true), expected.hex)
                assert.strictEqual(rpc.web3("sha3", data.hex), rpc.sha3(data.hex, true));

                // ASCII input
                assert.strictEqual(rpc.web3("sha3", abi.encode_hex(data.ascii)), expected.ascii);
                assert.strictEqual(rpc.sha3(data.ascii), expected.ascii);
                assert.strictEqual(rpc.web3("sha3", abi.encode_hex(data.ascii)), rpc.sha3(data.ascii));
            });

            it("gasPrice", function (done) {
                this.timeout(TIMEOUT);
                assert.isAbove(parseInt(rpc.gasPrice()), 0);
                rpc.gasPrice(function (res) {
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
                            assert.strictEqual(endBlock - startBlock, blocks);
                            done();
                        });
                    });
                });
            };
            test(0);
            test(1);
            test(2);
            test(3);
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

            // expected block hashes for network 2
            test({
                blockNumber: "0x1",
                blockHash: "0xad47413137a753b2061ad9b484bf7b0fc061f654b951b562218e9f66505be6ce"
            });
            test({
                blockNumber: "0x1b4",
                blockHash: "0xcc69010c942bb0d8232024dc32aa4404a1173da56c1b6abdead40a2bd8930d34"
            });
            test({
                blockNumber: "0x24f2",
                blockHash: "0x4d5d0d6ce0073cbe085589827152a83e4d54365d15eb4c0ae29118fc21f02d92"
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
                blockHash: "0xad47413137a753b2061ad9b484bf7b0fc061f654b951b562218e9f66505be6ce"
            });
            test({
                blockNumber: "0x1b4",
                blockHash: "0xcc69010c942bb0d8232024dc32aa4404a1173da56c1b6abdead40a2bd8930d34"
            });
            test({
                blockNumber: "0x24f2",
                blockHash: "0x4d5d0d6ce0073cbe085589827152a83e4d54365d15eb4c0ae29118fc21f02d92"
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

            it("getMarketsInBranch(1010101) -> hash[]", function (done) {
                var markets = rpc.applyReturns("hash[]", rpc.invoke({
                    to: contracts.Branches,
                    from: COINBASE,
                    method: "getMarketsInBranch",
                    inputs: ["branch"],
                    signature: ["int256"],
                    params: 1010101
                }));
                if (markets.error) return done(markets);
                assert.isAbove(markets.length, 1);
                assert.strictEqual(markets[0].length, 66);
                rpc.invoke({
                    to: contracts.Branches,
                    from: COINBASE,
                    method: "getMarketsInBranch",
                    inputs: ["branch"],
                    signature: ["int256"],
                    params: 1010101
                }, function (res) {
                    if (res.error) return done(res);
                    res = rpc.applyReturns("hash[]", res);
                    assert.isAbove(res.length, 1);
                    assert.strictEqual(res[0].length, 66);
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

        describe("setLocalNode", function () {

            after(function () { rpc.useHostedNode(); });

            var test = function (command) {

                it("[sync] local node failure", function () {
                    this.timeout(TIMEOUT);
                    rpc.reset();
                    rpc.setLocalNode("http://127.0.0.0");
                    assert.strictEqual(rpc.nodes.local, "http://127.0.0.0");
                    assert.deepEqual(rpc.nodes.hosted, HOSTED_NODES);
                    assert.throws(function () { rpc.broadcast(command); }, Error, /410/);
                });

                it("[async] local node failure", function (done) {
                    this.timeout(TIMEOUT);
                    rpc.reset();
                    rpc.setLocalNode("http://127.0.0.0");
                    assert.strictEqual(rpc.nodes.local, "http://127.0.0.0");
                    assert.deepEqual(rpc.nodes.hosted, HOSTED_NODES);
                    rpc.broadcast(command, function (err) {
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

        var callbacks = {
            onSent: function (res) {
                assert.property(res, "txHash");
                assert.property(res, "callReturn");
                assert.strictEqual(res.txHash.length, 66);
            },
            onSuccess: function (res) {
                assert.property(res, "txHash");
                assert.property(res, "callReturn");
                assert.property(res, "blockHash");
                assert.property(res, "blockNumber");
                assert.property(res, "nonce");
                assert.property(res, "transactionIndex");
                assert.property(res, "gas");
                assert.property(res, "gasPrice");
                assert.property(res, "input");
                assert.strictEqual(res.txHash.length, 66);
                assert.strictEqual(res.callReturn, "1");
                assert.isAbove(parseInt(res.blockNumber), 0);
                assert.isAbove(parseInt(res.nonce), 0);
                assert.strictEqual(res.from, COINBASE);
                assert.strictEqual(res.to, contracts.Faucets);
                assert.strictEqual(abi.number(res.value), 0);
            }
        };

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
                it(t.itx.method, function (done) {
                    this.timeout(TIMEOUT);
                    rpc.fire(t.itx, function (res) {
                        assert.strictEqual(res, t.expected);
                        done();
                    });
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
                expected: "1"
            });

        });

        if (process.env.INTEGRATION_TESTS) {

            describe("call-send-confirm sequence", function () {

                before(function (done) {
                    this.timeout(TIMEOUT);
                    rpc.TX_POLL_MAX = 64;
                    rpc.TX_POLL_INTERVAL = 12000;
                    var tx = {
                        to: contracts.Faucets,
                        from: COINBASE,
                        method: "reputationFaucet",
                        inputs: ["branch"],
                        signature: ["int256"],
                        params: "0xf69b5",
                        returns: "number"
                    };
                    rpc.transact(tx,
                        function (res) {
                            callbacks.onSent(res);
                            TXHASH = res.txHash;
                        },
                        function (res) {
                            callbacks.onSuccess(res);
                            assert.strictEqual(abi.encode(tx), res.input);
                            done();
                        },
                        done
                    );
                });

                describe("checkBlockHash", function () {

                    var test = function (t) {
                        it(t.itx.method, function (done) {
                            this.timeout(TIMEOUT);
                            rpc.txs[t.txhash] = {
                                hash: t.txhash,
                                tx: t.tx,
                                count: 0,
                                status: "pending"
                            };
                            rpc.checkBlockHash(
                                t.tx,
                                t.callreturn,
                                t.itx,
                                t.txhash,
                                t.returns,
                                function (res) {
                                    callbacks.onSent(res);
                                    assert.strictEqual(res.callReturn, t.callreturn);
                                },
                                function (res) {
                                    callbacks.onSuccess(res);
                                    assert.strictEqual(abi.encode(t.itx), res.input);
                                    assert.strictEqual(rpc.txs[t.txhash].status, "confirmed");
                                    assert.strictEqual(rpc.txs[t.txhash].count, 1);
                                    done();
                                },
                                done
                            );
                        });
                    };

                    test({
                        tx: {
                            nonce: "0xf22",
                            blockHash: "0x043d7f980beb3c59b3335d90c4b14794f4577a71ff591c80858fac8a2f99dc39",
                            blockNumber: "0x2f336",
                            transactionIndex: "0x0",
                            from: COINBASE,
                            to: contracts.Faucets,
                            value: "0x0",
                            gas: "0x2fd618",
                            gasPrice: "0xba43b7400",
                            input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
                            callReturn: "1",
                            hash: TXHASH
                        },
                        callreturn: "1",
                        itx: {
                            to: contracts.Faucets,
                            from: COINBASE,
                            method: "reputationFaucet",
                            inputs: ["branch"],
                            signature: ["int256"],
                            params: "0xf69b5"
                        },
                        txhash: TXHASH,
                        returns: "number"
                    });
                });

                describe("txNotify", function () {

                    var test = function (t) {
                        it(t.itx.method, function (done) {
                            this.timeout(TIMEOUT);
                            rpc.txs[TXHASH] = {
                                hash: TXHASH,
                                tx: t.itx,
                                count: 0,
                                status: "pending"
                            };
                            rpc.txNotify(
                                t.callreturn,
                                t.itx,
                                TXHASH,
                                t.returns,
                                function (res) {
                                    callbacks.onSent(res);
                                    assert.strictEqual(res.callReturn, t.callreturn);
                                },
                                function (res) {
                                    callbacks.onSuccess(res);
                                    assert.notProperty(rpc.notifications, TXHASH);
                                    assert.strictEqual(abi.encode(t.itx), res.input);
                                    assert.strictEqual(rpc.txs[TXHASH].status, "confirmed");
                                    assert.strictEqual(rpc.txs[TXHASH].count, 1);
                                    done();
                                },
                                done
                            );
                        });
                        it("trailing timeout check", function (done) {
                            this.timeout(TIMEOUT);
                            rpc.TX_POLL_MAX = 2;
                            rpc.TX_POLL_INTERVAL = 1;
                            rpc.txs[TXHASH] = {
                                hash: TXHASH,
                                tx: t.itx,
                                count: 0,
                                status: "pending"
                            };
                            rpc.txNotify(
                                t.callreturn,
                                t.itx,
                                TXHASH,
                                t.returns,
                                function (res) {
                                    callbacks.onSent(res);
                                    assert.strictEqual(res.callReturn, t.callreturn);
                                },
                                function (res) {
                                    callbacks.onSuccess(res);
                                    assert.notProperty(rpc.notifications, TXHASH);
                                    assert.strictEqual(abi.encode(t.itx), res.input);
                                    assert.strictEqual(rpc.txs[TXHASH].status, "confirmed");
                                    assert.isTrue(false);
                                },
                                function (res) {
                                    assert.strictEqual(rpc.txs[TXHASH].count, rpc.TX_POLL_MAX);
                                    assert.strictEqual(rpc.txs[TXHASH].status, "unconfirmed");
                                    assert.deepEqual(res, errors.TRANSACTION_NOT_CONFIRMED);
                                    done();
                                }
                            );
                        });
                    };

                    test({
                        callreturn: "1",
                        itx: {
                            to: contracts.Faucets,
                            from: COINBASE,
                            method: "reputationFaucet",
                            inputs: ["branch"],
                            signature: ["int256"],
                            params: "0xf69b5"
                        },
                        returns: "number"
                    });

                });

                describe("confirmTx", function () {

                    var test = function (t) {
                        it(t.tx.method, function (done) {
                            this.timeout(TIMEOUT);
                            delete rpc.txs[TXHASH];
                            rpc.confirmTx(
                                t.tx,
                                TXHASH,
                                t.returns,
                                function (res) {
                                    callbacks.onSent(res);
                                    assert.strictEqual(res.callReturn, t.expected);
                                },
                                function (res) {
                                    callbacks.onSuccess(res);
                                    assert.strictEqual(abi.encode(t.tx), res.input);
                                    done();
                                },
                                done
                            );
                        });
                    };

                    test({
                        tx: {
                            to: contracts.Faucets,
                            from: COINBASE,
                            method: "reputationFaucet",
                            inputs: ["int256"],
                            signature: ["int256"],
                            params: "0xf69b5",
                            returns: "number"
                        },
                        returns: "number",
                        expected: "1"
                    });

                });

                describe("transact", function () {

                    var test = function (t) {
                        it(t.tx.method, function (done) {
                            this.timeout(TIMEOUT);
                            rpc.TX_POLL_MAX = 64;
                            rpc.TX_POLL_INTERVAL = 12000;
                            rpc.transact(
                                t.tx,
                                callbacks.onSent,
                                function (res) {
                                    callbacks.onSuccess(res);
                                    assert.strictEqual(abi.encode(t.tx), res.input);
                                    done();
                                },
                                done
                            );
                        });
                    };

                    test({
                        tx: {
                            to: contracts.Faucets,
                            from: COINBASE,
                            method: "reputationFaucet",
                            inputs: ["branch"],
                            signature: ["int256"],
                            params: "0xf69b5",
                            returns: "number"
                        }
                    });

                });
            });
        }
    }

    describe("HTTP", function () { runtests(); });
    describe("WebSocket", function () { runtests("wss://ws.augur.net"); });

});
