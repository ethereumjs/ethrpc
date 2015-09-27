(function () {
/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var path = require("path");
var cp = require("child_process");
var chalk = require("chalk");
var assert = require("chai").assert;
var async = require("async");
var contracts = require("augur-contracts");
var abi = require("augur-abi");
var rpc = require("../");
var errors = require("../errors");

describe("IPC", function () {

    var DEBUG = false;
    var DATADIR = path.join(process.env.HOME, ".augur-test");
    var COINBASE = "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b";
    var TIMEOUT = 360000;
    var SHA3_INPUT = "boom!";
    var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    var PROTOCOL_VERSION = "62";
    var TXHASH = "0x8807d1cf7bfad194122285cc586ffa72e124e2c47ff6b56067d5193511993c28";
    var NETWORK_ID = "10101";
    contracts = contracts[NETWORK_ID];
    var requests = 0;
    var geth;

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
            assert.strictEqual(res.to, contracts.faucets);
            assert.strictEqual(abi.number(res.value), 0);
        }
    };

    process.on("exit", function () { if (geth) geth.kill(); });

    before(function (done) {
        this.timeout(TIMEOUT);
        rpc.reset();
        rpc.balancer = false;
        rpc.ipcpath = path.join(DATADIR, "geth.ipc");
        cp.exec("ps cax | grep geth > /dev/null", function (err, stdout) {
            if (err === null) return done();
            geth = cp.spawn("geth", [
                "--etherbase", COINBASE,
                "--unlock", COINBASE,
                "--mine",
                "--nodiscover",
                "--networkid", NETWORK_ID,
                "--port", 30304,
                "--rpcport", 8547,
                "--rpc",
                "--datadir", DATADIR,
                "--password", path.join(DATADIR, ".password")
            ]);
            geth.stdout.on("data", function (data) {
                if (DEBUG) process.stdout.write(chalk.cyan.dim(data));
            });
            geth.stderr.on("data", function (data) {
                if (DEBUG) process.stdout.write(chalk.white.dim(data));
                if (data.toString().indexOf("IPC service started") > -1) {
                    done();
                }
            });
            geth.on("close", function (code) {
                if (code !== 2 && code !== 0) geth.kill();
            });
        });
    });

    after(function (done) {
        if (geth) geth.kill();
        done();
    });

    describe("broadcast", function () {

        var test = function (t) {
            it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
                this.timeout(TIMEOUT);
                rpc.broadcast(t.command, function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(res, t.expected);
                    done();
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

    describe("listening", function () {

        var test = function (t) {
            it(t.node + " -> " + t.listening, function (done) {
                this.timeout(TIMEOUT);
                rpc.listening(function (listening) {
                    assert.strictEqual(listening, t.listening);
                    done();
                });
            });
        };

        test({ listening: true });

    });

    describe("version (network ID)", function () {

        var test = function (t) {
            it(t.node + " -> " + t.version, function (done) {
                this.timeout(TIMEOUT);
                rpc.version(function (version) {
                    if (version.error) return done(version);
                    assert.strictEqual(version, t.version);
                    done();
                });
            });
        };

        test({ version: NETWORK_ID });

    });

    describe("unlocked", function () {

        var test = function (t) {
            it(t.node + " -> " + t.unlocked, function (done) {
                this.timeout(TIMEOUT);
                rpc.unlocked(t.account, function (unlocked) {
                    if (unlocked.error) return done(unlocked);
                    assert.strictEqual(unlocked, t.unlocked);
                    done();
                });
            });
        };

        test({
            account: COINBASE,
            unlocked: true
        });

    });

    describe("Ethereum bindings", function () {

        it("raw('eth_coinbase')", function (done) {
            rpc.raw("eth_coinbase", null, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, COINBASE);
                done();
            });
        });

        it("eth('coinbase')", function (done) {
            rpc.eth("coinbase", null, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, COINBASE);
                done();
            });
        });

        it("eth('protocolVersion')", function (done) {
            rpc.eth("protocolVersion", null, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, PROTOCOL_VERSION);
                done();
            });
        });

        it("web3_sha3('" + SHA3_INPUT + "')", function (done) {
            rpc.web3("sha3", SHA3_INPUT, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, SHA3_DIGEST);
                rpc.sha3(SHA3_INPUT, function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(res, SHA3_DIGEST);
                    done();
                });
            });
        });

        it("leveldb('putString')", function (done) {
            rpc.leveldb("putString", [
                "augur_test_DB",
                "testkey",
                "test!"
            ], function (res) {
                if (res.error) return done(res);
                assert.isTrue(res);
                done();
            });
        });

        it("leveldb('getString')", function (done) {
            rpc.leveldb("putString", [
                "augur_test_DB",
                "testkey",
                "test!"
            ], function (res) {
                if (res.error) return done(res);
                rpc.leveldb(
                    "getString",
                    ["augur_test_DB", "testkey"],
                    function (res) {
                        if (res.error) return done(res);
                        assert.strictEqual(res, "test!");
                        done();
                    }
                );
            });
        });

        it("gasPrice", function (done) {
            rpc.gasPrice(function (res) {
                if (res.error) return done(res);
                assert.isAbove(parseInt(res), 0);
                done();
            });
        });

        it("blockNumber", function (done) {
            rpc.blockNumber(function (res) {
                if (res.error) return done(res);
                assert.isAbove(parseInt(res), 0);
                done();
            });
        });

        it("balance/getBalance", function (done) {
            rpc.balance(COINBASE, function (res) {
                if (res.error) return done(res);
                assert.isAbove(parseInt(res), 0);
                rpc.getBalance(COINBASE, function (r) {
                    if (r.error) return done(r);
                    assert.isAbove(parseInt(r), 0);
                    assert.strictEqual(r, res);
                    rpc.balance(COINBASE, "latest", function (r) {
                        if (r.error) return done(r);
                        assert.isAbove(parseInt(r), 0);
                        assert.strictEqual(r, res);
                        rpc.getBalance(COINBASE, "latest", function (r) {
                            if (r.error) return done(r);
                            assert.isAbove(parseInt(r), 0);
                            assert.strictEqual(r, res);
                            rpc.balance(COINBASE, null, function (r) {
                                if (r.error) return done(r);
                                assert.isAbove(parseInt(r), 0);
                                assert.strictEqual(r, res);
                                rpc.getBalance(COINBASE, null, function (r) {
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
            rpc.txCount(COINBASE, function (res) {
                if (res.error) return done(res);
                assert(parseInt(res) >= 0);
                rpc.pendingTxCount(COINBASE, function (res) {
                    if (res.error) return done(res);
                    assert(parseInt(res) >= 0);
                    done();
                });
            });
        });

        it("peerCount", function (done) {
            switch (NETWORK_ID) {
            case "10101":
                rpc.peerCount(function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(parseInt(res), 0);
                    done();
                });
                break;
            default:
                rpc.peerCount(function (res) {
                    if (res.error) return done(res);
                    assert(parseInt(res) >= 0);
                    done();
                });
            }
        });

        it("hashrate", function (done) {
            rpc.hashrate(function (res) {
                if (res.error) return done(res);
                assert(parseInt(res) >= 0);
                done();
            });
        });

        it("mining", function (done) {
            switch (NETWORK_ID) {
            case "10101":
                rpc.mining(function (res) {
                    if (res.error) return done(res);
                    assert.isTrue(res);
                    done();
                });
                break;
            default:
                rpc.mining(function (res) {
                    if (res.error) return done(res);
                    assert.isBoolean(res);
                    done();
                });
            }
        });

        it("clientVersion", function (done) {
            rpc.clientVersion(function (res) {
                if (res.error) return done(res);
                assert.isString(res);
                assert.strictEqual(res.split('/')[0], "Geth");
                done();
            });
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
            it(t.blockNumber + " -> " + t.blockHash, function (done) {
                this.timeout(TIMEOUT);
                rpc.getBlock(t.blockNumber, true, function (block) {
                    if (block.error) return done(block);
                    asserts(t, block);
                    done();
                });
            });
        };

        // expected block hashes for network 10101
        test({
            blockNumber: "0x1",
            blockHash: "0x9f9954b5da59d78d248c0fcc742e3256c38fce7733c02ae5af3d67d649633e91"
        });
        test({
            blockNumber: "0x1b4",
            blockHash: "0x0b8cac64fb0f4a9effc4156b6a7a076a0ad842833de7d6280971caadb0a45b44"
        });
        test({
            blockNumber: "0x24f2",
            blockHash: "0x22af941639d241562a1668a2fc78e3e975c982ae456ec29c8c1c872e13a901df"
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
            it(t.blockHash + " -> " + t.blockNumber, function (done) {
                this.timeout(TIMEOUT);
                rpc.getBlockByHash(t.blockHash, true, function (block) {
                    asserts(t, block);
                    done();
                });
            });
        };

        // network 10101
        test({
            blockHash: "0x9f9954b5da59d78d248c0fcc742e3256c38fce7733c02ae5af3d67d649633e91",
            blockNumber: "0x1"
        });
        test({
            blockHash: "0x0b8cac64fb0f4a9effc4156b6a7a076a0ad842833de7d6280971caadb0a45b44",
            blockNumber: "0x1b4"
        });
        test({
            blockHash: "0x22af941639d241562a1668a2fc78e3e975c982ae456ec29c8c1c872e13a901df",
            blockNumber: "0x24f2"
        });
    });

    describe("Calls", function () {

        describe("invoke", function () {
            var encodedParams, returns, cashFaucet;

            before(function () {
                encodedParams = "0x7a66d7ca"+
                "00000000000000000000000000000000000000000000000000000000000f69b5";
                returns = "number";
                cashFaucet = {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "cashFaucet",
                    send: false
                };
            });

            it("invoke == call == broadcast", function (done) {
                this.timeout(TIMEOUT);
                rpc.invoke({
                    to: contracts.branches,
                    from: COINBASE,
                    method: "getVotePeriod",
                    signature: "i",
                    returns: returns,
                    params: "0x0f69b5"
                }, function (invokeResult) {
                    rpc.call({
                        from: COINBASE,
                        to: contracts.branches,
                        data: encodedParams,
                        returns: returns
                    }, function (callResult) {
                        rpc.broadcast({
                            id: ++requests,
                            jsonrpc: "2.0",
                            method: "eth_call",
                            params: [{
                                from: COINBASE,
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

            it("cashFaucet -> raw", function (done) {
                rpc.invoke(cashFaucet, function (res) {
                    assert.include([
                        "0x01",
                        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                    ], res);
                    done();
                });
            });

            it("cashFaucet -> number", function (done) {
                cashFaucet.returns = "number";
                rpc.invoke(cashFaucet, function (res) {
                    assert.include(["1", "-1"], res);
                    done();
                });
            });

            it("getMarkets(1010101) -> hash[]", function (done) {
                rpc.invoke({
                    to: contracts.branches,
                    from: COINBASE,
                    method: "getMarkets",
                    signature: "i",
                    returns: "hash[]",
                    params: 1010101
                }, function (res) {
                    if (res.error) return done(res);
                    assert.isAbove(res.length, 1);
                    assert.strictEqual(res[0].length, 66);
                    done();
                });
            });

        });

        describe("errorCodes", function () {

            var test = function (t) {
                it(t.itx.method, function () {
                    var actual = rpc.errorCodes(t.itx, t.response);
                    assert.strictEqual(actual, t.expected);
                });
            };

            test({
                itx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5",
                    returns: "number"
                },
                response: "1",
                expected: "1"
            });


        });

        describe("encodeResult", function () {

            var test = function (t) {
                it(t.result + "," + t.returns + " -> " + t.expected, function () {
                    var actual = rpc.encodeResult(t.result, t.returns);
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
                        if (res.error) return done(res);
                        assert.strictEqual(res, t.expected);
                        done();
                    });
                });
            };

            test({
                itx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5",
                    returns: "number"
                },
                expected: "1"
            });

        });

    });

    describe("Transactions", function () {

        describe("sendEther", function () {

            var etherValue = "1";
            var recipient = "0x639b41c4d3d399894f2a57894278e1653e7cd24c";

            it("send " + etherValue + " ether to " + recipient, function (done) {
                this.timeout(TIMEOUT);
                rpc.balance(recipient, null, function (startBalance) {
                    if (startBalance.error) return done(startBalance);
                    startBalance = abi.bignum(startBalance).dividedBy(rpc.ETHER);
                    rpc.sendEther({
                        to: recipient,
                        value: etherValue,
                        from: COINBASE,
                        onSent: function (res) {
                            assert.isNotNull(res);
                            assert.property(res, "txHash");
                            assert.property(res, "callReturn");
                            assert.isNotNull(res.txHash);
                            assert.strictEqual(res.txHash.length, 66);
                            assert.isNull(res.callReturn);
                        },
                        onSuccess: function (res) {
                            assert.strictEqual(res.from, COINBASE);
                            assert.strictEqual(res.to, recipient);
                            assert.strictEqual(abi.bignum(res.value).dividedBy(rpc.ETHER).toFixed(), etherValue);
                            rpc.balance(recipient, null, function (finalBalance) {
                                if (finalBalance.error) return done(finalBalance);
                                finalBalance = abi.bignum(finalBalance).dividedBy(rpc.ETHER);
                                assert.strictEqual(finalBalance.sub(startBalance).toFixed(), etherValue);
                                done();
                            });
                        },
                        onFailed: done
                    });
                });
            });

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
                    to: contracts.faucets,
                    value: "0x0",
                    gas: "0x2fd618",
                    gasPrice: "0xba43b7400",
                    input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
                    callReturn: "1",
                    hash: TXHASH
                },
                callreturn: "1",
                itx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
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
                    rpc.txs[t.txhash] = {
                        hash: t.txhash,
                        tx: t.itx,
                        count: 0,
                        status: "pending"
                    };
                    rpc.txNotify(
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
                            assert.notProperty(rpc.notifications, t.txhash);
                            assert.strictEqual(abi.encode(t.itx), res.input);
                            assert.strictEqual(rpc.txs[t.txhash].status, "confirmed");
                            assert.strictEqual(rpc.txs[t.txhash].count, 1);
                            done();
                        },
                        done
                    );
                });
                it("trailing timeout check", function (done) {
                    this.timeout(TIMEOUT);
                    rpc.TX_POLL_MAX = 2;
                    rpc.TX_POLL_INTERVAL = 1;
                    rpc.txs[t.txhash] = {
                        hash: t.txhash,
                        tx: t.itx,
                        count: 0,
                        status: "pending"
                    };
                    rpc.txNotify(
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
                            assert.notProperty(rpc.notifications, t.txhash);
                            assert.strictEqual(abi.encode(t.itx), res.input);
                            assert.strictEqual(rpc.txs[t.txhash].status, "confirmed");
                            assert.isTrue(false);
                        },
                        function (res) {
                            assert.strictEqual(rpc.txs[t.txhash].count, rpc.TX_POLL_MAX);
                            assert.strictEqual(rpc.txs[t.txhash].status, "unconfirmed");
                            assert.deepEqual(res, errors.TRANSACTION_NOT_CONFIRMED);
                            done();
                        }
                    );
                });
            };

            test({
                callreturn: "1",
                itx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5"
                },
                txhash: TXHASH,
                returns: "number"
            });

        });

        describe("confirmTx", function () {

            var test = function (t) {
                it(t.tx.method, function (done) {
                    this.timeout(TIMEOUT);
                    delete rpc.txs[t.txhash];
                    rpc.confirmTx(
                        t.tx,
                        t.txhash,
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
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5",
                    returns: "number"
                },
                txhash: TXHASH,
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
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5",
                    returns: "number"
                }
            });

        });

    });

});

})();
