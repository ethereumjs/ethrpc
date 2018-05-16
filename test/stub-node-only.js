/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var ethereumjsAbi = require("ethereumjs-abi");
var os = require("os");
var helpers = require("./helpers");
var rpc = require("../src");
var RPCError = require("../src/errors/rpc-error");
var constants = require("../src/constants");

function createReasonableTransactPayload() {
  return {
    name: "myTransaction",
    returns: "uint256",
    signature: [],
    from: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    to: "0xdeadbabedeadbabedeadbabedeadbabedeadbabe",
  };
}

describe("tests that only work against stub server", function () {
  function tests(transportType, transportAddress) {
    describe(transportType, function () {

      describe("connectivity", function () {
        var stubRpcServer = null;
        beforeEach(function (done) {
          stubRpcServer = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          done();
        });
        afterEach(function (done) {
          rpc.resetState();
          stubRpcServer.destroy(done);
        });

        it("has no addresses", function (done) {
          rpc.connect({
            httpAddresses: [],
            wsAddresses: [],
            ipcAddresses: [],
            errorHandler: function (error) { assert.fail(error); },
          }, function (error) {
            assert.isNotNull(error);
            assert.strictEqual(error.message, "Unable to connect to an Ethereum node via any transport. (Web3, HTTP, WS, IPC).");
            done();
          });
        });

        it("returns failure to initial RPC call", function (done) {
          stubRpcServer.addResponder(function (/*jso*/) { return new Error("apple"); });
          var configuration = helpers.getRpcConfiguration(transportType, transportAddress);
          rpc.connect(configuration, function (err) {
            assert.isNotNull(err);
            done();
          });
        });

        it("starts connected > uses connection", function (done) {
          stubRpcServer.addResponder(function (request) {
            if (request.method === "net_version") return "apple";
          });
          helpers.rpcConnect(transportType, transportAddress, function () {
            rpc.version(function (err, version) {
              assert.isNull(err);
              assert.strictEqual(version, "apple");
              done();
            });
          });
        });

        // NOTE: these tests are brittle for IPC on Linux.  see: https://github.com/nodejs/node/issues/11973
        if (transportType !== "IPC" || !process.env.CONTINUOUS_INTEGRATION) { // skip brittle IPC test for CI
          it("starts connected > uses connection > loses connection > reconnects > uses connection", function (done) {
            stubRpcServer.addResponder(function (request) {
              if (request.method === "net_version") return "apple";
            });
            helpers.rpcConnect(transportType, transportAddress, function () {
              rpc.version(function (err, version) {
                assert.isNull(err);
                assert.strictEqual(version, "apple");
                stubRpcServer.destroy(function () {
                  stubRpcServer = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
                  rpc.version(function (err, version) {
                    assert.isNull(err);
                    assert.strictEqual(version, "default stub rpc server version");
                    done();
                  });
                });
              });
            });
          });
          it("starts connected > uses connection > loses connection > uses connection > reconnects > uses connection (brittle)", function (done) {
            stubRpcServer.addResponder(function (request) { if (request.method === "net_version") return "apple"; });
            helpers.rpcConnect(transportType, transportAddress, function () {
              rpc.version(function (err, version) {
                assert.isNull(err);
                assert.strictEqual(version, "apple");
                stubRpcServer.destroy(function () {
                  var doneCount = 0;
                  function maybeDone() {
                    if (++doneCount === 2) done();
                  }
                  rpc.version(function (err, version) {
                    assert.isNull(err);
                    assert.strictEqual(version, "banana");
                    maybeDone();
                  });
                  stubRpcServer = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
                  stubRpcServer.addResponder(function (request) { if (request.method === "net_version") return "banana"; });
                  rpc.version(function (err, version) {
                    assert.isNull(err);
                    assert.strictEqual(version, "banana");
                    maybeDone();
                  });
                });
              });
            });
          });
        }
      });

      describe("raw", function () {
        var server;
        beforeEach(function (done) {
          server = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          helpers.rpcConnect(transportType, transportAddress, done);
        });
        afterEach(function (done) {
          rpc.resetState();
          server.destroy(done);
        });

        it("net_version", function (done) {
          server.addExpectation(function (jso) { return jso.method === "net_version"; });
          server.addResponder(function (jso) { if (jso.method === "net_version") return "apple"; });
          rpc.raw("net_version", null, function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "apple");
            server.assertExpectations();
            done();
          });
        });
      });

      describe("web3", function () {
        var server;
        beforeEach(function (done) {
          server = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          helpers.rpcConnect(transportType, transportAddress, done);
        });
        afterEach(function (done) {
          rpc.resetState();
          server.destroy(done);
        });

        it("clientVersion", function (done) {
          server.addExpectation(function (jso) { return jso.method === "web3_clientVersion"; });
          server.addResponder(function (jso) { if (jso.method === "web3_clientVersion") return "apple"; });
          rpc.clientVersion(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "apple");
            server.assertExpectations();
            done();
          });
        });

        it("sha3", function (done) {
          // sha3 is optimized to do the hash locally rather than on the ethereum node, so we don't need any setup
          assert.strictEqual(rpc.sha3("0x68656c6c6f20776f726c64", "hex"), "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad");
          assert.strictEqual(rpc.sha3("hello world", "utf8"), "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad");
          done();
        });
      });

      describe("net", function () {
        var server;
        beforeEach(function (done) {
          server = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          helpers.rpcConnect(transportType, transportAddress, done);
        });
        afterEach(function (done) {
          rpc.resetState();
          server.destroy(done);
        });

        it("listening", function (done) {
          server.addExpectation(function (jso) { return jso.method === "net_listening"; });
          server.addResponder(function (jso) { if (jso.method === "net_listening") return true; });
          rpc.listening(function (err, result) {
            assert.isNull(err);
            assert.isTrue(result);
            server.assertExpectations();
            done();
          });
        });

        it("peerCount", function (done) {
          server.addExpectation(function (jso) { return jso.method === "net_peerCount"; });
          server.addResponder(function (jso) { if (jso.method === "net_peerCount") return "0x2"; });
          rpc.peerCount(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x2");
            server.assertExpectations();
            done();
          });
        });

        it("version", function (done) {
          server.addExpectation(function (jso) { return jso.method === "net_version"; });
          server.addResponder(function (jso) { if (jso.method === "net_version") return "apple"; });
          rpc.version(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "apple");
            server.assertExpectations();
            done();
          });
        });

        it("netVersion", function (done) {
          server.addExpectation(function (jso) { return jso.method === "net_version"; });
          server.addResponder(function (jso) { if (jso.method === "net_version") return "apple"; });
          rpc.netVersion(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "apple");
            server.assertExpectations();
            done();
          });
        });
      });

      describe("eth", function () {
        var server;
        beforeEach(function (done) {
          server = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          helpers.rpcConnect(transportType, transportAddress, done);
        });
        afterEach(function (done) {
          rpc.resetState();
          server.destroy(done);
        });

        it("accounts", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_accounts"; });
          server.addResponder(function (jso) { if (jso.method === "eth_accounts") return "0x407d73d8a49eeb85d32cf465507dd71d507100c1"; });
          rpc.accounts(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x407d73d8a49eeb85d32cf465507dd71d507100c1");
            server.assertExpectations();
            done();
          });
        });

        it("blockNumber", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_blockNumber"; });
          server.addResponder(function (jso) { if (jso.method === "eth_blockNumber") return "0x4b7"; });
          rpc.blockNumber(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x4b7");
            server.assertExpectations();
            done();
          });
        });

        it("call", function (done) {
          server.addExpectation(function (jso) {
            return jso.method === "eth_call"
              && jso.params[0].from === "0x407d73d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[0].to === "0xa94f5374fce5edbc8e2a8697c15331677e6ebf0b"
              && jso.params[0].value === "0x186a0"
              && jso.params[1] === "latest";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_call") return "0x"; });
          rpc.call({ from: "0x407d73d8a49eeb85d32cf465507dd71d507100c1", to: "0xa94f5374fce5edbc8e2a8697c15331677e6ebf0b", value: 100000 }, function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x");
            server.assertExpectations();
            done();
          });
        });

        it("coinbase", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_coinbase"; });
          server.addResponder(function (jso) { if (jso.method === "eth_coinbase") return "0x407d73d8a49eeb85d32cf465507dd71d507100c1"; });
          rpc.coinbase(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x407d73d8a49eeb85d32cf465507dd71d507100c1");
            server.assertExpectations();
            done();
          });
        });

        it("estimateGas", function (done) {
          server.addExpectation(function (jso) {
            return jso.method === "eth_estimateGas"
              && jso.params[0].from === "0x407d73d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[0].to === "0xa94f5374fce5edbc8e2a8697c15331677e6ebf0b"
              && jso.params[0].value === "0x186a0"
              && jso.params[1] === "latest";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_estimateGas") return "0x5208"; });
          rpc.estimateGas({ from: "0x407d73d8a49eeb85d32cf465507dd71d507100c1", to: "0xa94f5374fce5edbc8e2a8697c15331677e6ebf0b", value: "0x186a0" }, function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x5208");
            server.assertExpectations();
            done();
          });
        });

        it("gasPrice", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_gasPrice"; });
          server.addResponder(function (jso) { if (jso.method === "eth_gasPrice") return "0x9184e72a000"; });
          rpc.gasPrice(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x9184e72a000");
            server.assertExpectations();
            done();
          });
        });

        it("getBalance", function (done) {
          server.addExpectation(function (jso) {
            return jso.method === "eth_getBalance"
              && jso.params.length === 2
              && jso.params[0] === "0x407d73d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[1] === "latest";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getBalance") return "0x0234c8a3397aab58"; });
          rpc.getBalance("0x407d73d8a49eeb85d32cf465507dd71d507100c1", null, function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x0234c8a3397aab58");
            server.assertExpectations();
            done();
          });
        });

        it("getBlockByHash", function (done) {
          var expectedBlock = {
            difficulty: "0xd60a0c8",
            extraData: "0xd783010505846765746887676f312e372e33856c696e7578",
            gasLimit: "0x47e7c4",
            gasUsed: "0x5208",
            hash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
            logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            miner: "0xd490af05bf82ef6c6ba034b22d18c39b5d52cc54",
            mixHash: "0x36950956217410542fd06b88e474e6df2765d1d9eacc608fa55b834eca84a1fe",
            nonce: "0x4ea9835c2ac5857e",
            number: "0x186a0",
            parentHash: "0x8e535b16f5664fa509585626277e454c63ef4aeb402de0c41d9a364be69517e6",
            receiptsRoot: "0x4a4ca005b44989d4d4285970c830e61f6ee2b98d16b12b10277bb10232cde8f8",
            sha3Uncles: "0x9ae8bc973d19b0784e7b47340fad13edadc841b7fcf17894c002407c10befc08",
            size: "0x4a7",
            stateRoot: "0x69d017196eccb1d9f1ba578a1f00d7153226ed6da3843f181da43743fd79e2ad",
            timestamp: "0x5845709c",
            totalDifficulty: "0xac18c72ebbc",
            transactions: [{
              blockHash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
              blockNumber: "0x186a0",
              from: "0x687422eea2cb73b5d3e242ba5456b782919afc85",
              gas: "0x4cb26",
              gasPrice: "0x4a817c800",
              hash: "0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a",
              input: "0x",
              nonce: "0x39c6",
              to: "0x787f88347aa3eefcc16e9e71c672138181bce266",
              transactionIndex: "0x0",
              value: "0xde0b6b3a7640000",
              v: "0x1c",
              r: "0x739344b05d1084ffffd7f11e7226a3ffa633422268a6c83c15bad56bcb6d3486",
              s: "0x2b10836b3b632b337e410bb9661799b2467c16bdf626aa1ad70bced750540196",
            }],
            transactionsRoot: "0x1c66bef1f1c1083b8a2903ef5e8b528b3c359f390ad36d9bb120b1ce3aa3df64",
            uncles: ["0xd21d74cac9356eb7cfcc0d55edc326d72ba056a7f7bc7953ae94df3366e8b120"],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getBlockByHash"
              && jso.params.length === 2
              && jso.params[0] === "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918"
              && jso.params[1] === true;
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getBlockByHash") return expectedBlock; });
          rpc.getBlockByHash("0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918", undefined, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedBlock);
            server.assertExpectations();
            done();
          });
        });

        it("getBlockByNumber", function (done) {
          var expectedBlock = {
            difficulty: "0xd60a0c8",
            extraData: "0xd783010505846765746887676f312e372e33856c696e7578",
            gasLimit: "0x47e7c4",
            gasUsed: "0x5208",
            hash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
            logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            miner: "0xd490af05bf82ef6c6ba034b22d18c39b5d52cc54",
            mixHash: "0x36950956217410542fd06b88e474e6df2765d1d9eacc608fa55b834eca84a1fe",
            nonce: "0x4ea9835c2ac5857e",
            number: "0x186a0",
            parentHash: "0x8e535b16f5664fa509585626277e454c63ef4aeb402de0c41d9a364be69517e6",
            receiptsRoot: "0x4a4ca005b44989d4d4285970c830e61f6ee2b98d16b12b10277bb10232cde8f8",
            sha3Uncles: "0x9ae8bc973d19b0784e7b47340fad13edadc841b7fcf17894c002407c10befc08",
            size: "0x4a7",
            stateRoot: "0x69d017196eccb1d9f1ba578a1f00d7153226ed6da3843f181da43743fd79e2ad",
            timestamp: "0x5845709c",
            totalDifficulty: "0xac18c72ebbc",
            transactions: ["0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a"],
            transactionsRoot: "0x1c66bef1f1c1083b8a2903ef5e8b528b3c359f390ad36d9bb120b1ce3aa3df64",
            uncles: ["0xd21d74cac9356eb7cfcc0d55edc326d72ba056a7f7bc7953ae94df3366e8b120"],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getBlockByNumber"
              && jso.params.length === 2
              && jso.params[0] === "0x186a0"
              && jso.params[1] === false;
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getBlockByNumber") return expectedBlock; });
          rpc.getBlockByNumber(100000, false, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedBlock);
            server.assertExpectations();
            done();
          });
        });

        // TODO: getBlockTransactionCountByHash

        // TODO: getBlockTransactionCountByNumber

        it("getTransactionByHash", function (done) {
          var expectedResult = {
            blockHash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
            blockNumber: "0x186a0",
            from: "0x687422eea2cb73b5d3e242ba5456b782919afc85",
            gas: "0x4cb26",
            gasPrice: "0x4a817c800",
            hash: "0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a",
            input: "0x",
            nonce: "0x39c6",
            to: "0x787f88347aa3eefcc16e9e71c672138181bce266",
            transactionIndex: "0x0",
            value: "0xde0b6b3a7640000",
            v: "0x1c",
            r: "0x739344b05d1084ffffd7f11e7226a3ffa633422268a6c83c15bad56bcb6d3486",
            s: "0x2b10836b3b632b337e410bb9661799b2467c16bdf626aa1ad70bced750540196",
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getTransactionByHash"
              && jso.params.length === 1
              && jso.params[0] === "0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getTransactionByHash") return expectedResult; });
          rpc.getTransactionByHash("0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getFilterChanges", function (done) {
          var expectedResult = {
            id: 1,
            jsonrpc: "2.0",
            result: [
              {
                logIndex: "0x1",
                blockNumber: "0x1b4",
                blockHash: "0x8216c5785ac562ff41e2dcfdf5785ac562ff41e2dcfdf829c5a142f1fccd7d",
                transactionHash: "0xdf829c5a142f1fccd7d8216c5785ac562ff41e2dcfdf5785ac562ff41e2dcf",
                transactionIndex: "0x0",
                address: "0x16c5785ac562ff41e2dcfdf829c5a142f1fccd7d",
                data: "0x0000000000000000000000000000000000000000000000000000000000000000",
                topics: ["0x59ebeb90bc63057b6515673c3ecf9438e5058bca0f92585014eced636878c9a5"],
              },
            ],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getFilterChanges"
              && jso.params.length === 1
              && jso.params[0] === "0x16";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getFilterChanges") return expectedResult; });
          rpc.getFilterChanges(22, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getFilterLogs", function (done) {
          var expectedResult = {
            id: 1,
            jsonrpc: "2.0",
            result: [
              {
                logIndex: "0x1",
                blockNumber: "0x1b4",
                blockHash: "0x8216c5785ac562ff41e2dcfdf5785ac562ff41e2dcfdf829c5a142f1fccd7d",
                transactionHash: "0xdf829c5a142f1fccd7d8216c5785ac562ff41e2dcfdf5785ac562ff41e2dcf",
                transactionIndex: "0x0",
                address: "0x16c5785ac562ff41e2dcfdf829c5a142f1fccd7d",
                data: "0x0000000000000000000000000000000000000000000000000000000000000000",
                topics: ["0x59ebeb90bc63057b6515673c3ecf9438e5058bca0f92585014eced636878c9a5"],
              },
            ],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getFilterLogs"
              && jso.params.length === 1
              && jso.params[0] === "0x16";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getFilterLogs") return expectedResult; });
          rpc.getFilterLogs(22, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getLogs", function (done) {
          var expectedResult = {
            id: 1,
            jsonrpc: "2.0",
            result: [
              {
                logIndex: "0x1",
                blockNumber: "0x1b4",
                blockHash: "0x8216c5785ac562ff41e2dcfdf5785ac562ff41e2dcfdf829c5a142f1fccd7d",
                transactionHash: "0xdf829c5a142f1fccd7d8216c5785ac562ff41e2dcfdf5785ac562ff41e2dcf",
                transactionIndex: "0x0",
                address: "0x16c5785ac562ff41e2dcfdf829c5a142f1fccd7d",
                data: "0x0000000000000000000000000000000000000000000000000000000000000000",
                topics: ["0x59ebeb90bc63057b6515673c3ecf9438e5058bca0f92585014eced636878c9a5"],
              },
            ],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getLogs"
              && jso.params.length === 1
              && jso.params[0] === "0x16";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getLogs") return expectedResult; });
          rpc.getLogs(22, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getStorageAt", function (done) {
          server.addExpectation(function (jso) {
            return jso.method === "eth_getStorageAt"
              && jso.params.length === 3
              && jso.params[0] === "0x407d73d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[1] === "0x2"
              && jso.params[2] === "latest";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getStorageAt") return "0x0000000000000000000000000000000000000000000000000000000000000003"; });
          rpc.getStorageAt("0x407d73d8a49eeb85d32cf465507dd71d507100c1", 2, null, function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x0000000000000000000000000000000000000000000000000000000000000003");
            server.assertExpectations();
            done();
          });
        });

        // TODO: getTransactionByBlockHashAndIndex

        // TODO: getTransactionByBlockNumberAndIndex

        it("getTransactionByHash", function (done) {
          var expectedTransaction = {
            hash: "0xc6ef2fc5426d6ad6fd9e2a26abeab0aa2411b7ab17f30a99d3cb96aed1d1055b",
            nonce: "0x0",
            blockHash: "0xbeab0aa2411b7ab17f30a99d3cb9c6ef2fc5426d6ad6fd9e2a26a6aed1d1055b",
            blockNumber: "0x15df",
            transactionIndex: "0x1",
            from: "0x407d73d8a49eeb85d32cf465507dd71d507100c1",
            to: "0x85h43d8a49eeb85d32cf465507dd71d507100c1",
            value: "0x7f110",
            gas: "0x7f110",
            gasPrice: "0x09184e72a000",
            input: "0x603880600c6000396000f300603880600c6000396000f3603880600c6000396000f360",
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getTransactionByHash"
              && jso.params.length === 1
              && jso.params[0] === "0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getTransactionByHash") return expectedTransaction; });
          rpc.getTransactionByHash("0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedTransaction);
            server.assertExpectations();
            done();
          });
        });

        it("getTransactionCount (latest)", function (done) {
          var expectedResult = "0x1";
          server.addExpectation(function (jso) {
            return jso.method === "eth_getTransactionCount"
              && jso.params.length === 2
              && jso.params[0] === "0x407d73d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[1] === "latest";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getTransactionCount") return expectedResult; });
          rpc.getTransactionCount("0x407d73d8a49eeb85d32cf465507dd71d507100c1", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getTransactionCount (pending)", function (done) {
          var expectedResult = "0x2";
          server.addExpectation(function (jso) {
            return jso.method === "eth_getTransactionCount"
              && jso.params.length === 2
              && jso.params[0] === "0x407d73d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[1] === "pending";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getTransactionCount") return expectedResult; });
          rpc.getPendingTransactionCount("0x407d73d8a49eeb85d32cf465507dd71d507100c1", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getTransactionReceipt", function (done) {
          var expectedResult = {
            blockHash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
            blockNumber: "0x186a0",
            contractAddress: null,
            cumulativeGasUsed: "0x5208",
            from: "0x687422eea2cb73b5d3e242ba5456b782919afc85",
            gasUsed: "0x5208",
            logs: [],
            logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            root: "0xc569ec33d9119c828b96d7bcdcebbd6d810722e6675e8f399339b263978a09de",
            to: "0x787f88347aa3eefcc16e9e71c672138181bce266",
            transactionHash: "0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a",
            transactionIndex: "0x0",
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getTransactionReceipt"
              && jso.params.length === 1
              && jso.params[0] === "0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getTransactionReceipt") return expectedResult; });
          rpc.getTransactionReceipt("0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getUncleByBlockHashAndIndex", function (done) {
          var expectedResult = {
            difficulty: "0xd60a0c8",
            extraData: "0xd783010505846765746887676f312e372e33856c696e7578",
            gasLimit: "0x47e7c4",
            gasUsed: "0x5208",
            hash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
            logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            miner: "0xd490af05bf82ef6c6ba034b22d18c39b5d52cc54",
            mixHash: "0x36950956217410542fd06b88e474e6df2765d1d9eacc608fa55b834eca84a1fe",
            nonce: "0x4ea9835c2ac5857e",
            number: "0x186a0",
            parentHash: "0x8e535b16f5664fa509585626277e454c63ef4aeb402de0c41d9a364be69517e6",
            receiptsRoot: "0x4a4ca005b44989d4d4285970c830e61f6ee2b98d16b12b10277bb10232cde8f8",
            sha3Uncles: "0x9ae8bc973d19b0784e7b47340fad13edadc841b7fcf17894c002407c10befc08",
            size: "0x4a7",
            stateRoot: "0x69d017196eccb1d9f1ba578a1f00d7153226ed6da3843f181da43743fd79e2ad",
            timestamp: "0x5845709c",
            totalDifficulty: "0xac18c72ebbc",
            transactions: [{
              blockHash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
              blockNumber: "0x186a0",
              from: "0x687422eea2cb73b5d3e242ba5456b782919afc85",
              gas: "0x4cb26",
              gasPrice: "0x4a817c800",
              hash: "0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a",
              input: "0x",
              nonce: "0x39c6",
              to: "0x787f88347aa3eefcc16e9e71c672138181bce266",
              transactionIndex: "0x0",
              value: "0xde0b6b3a7640000",
              v: "0x1c",
              r: "0x739344b05d1084ffffd7f11e7226a3ffa633422268a6c83c15bad56bcb6d3486",
              s: "0x2b10836b3b632b337e410bb9661799b2467c16bdf626aa1ad70bced750540196",
            }],
            transactionsRoot: "0x1c66bef1f1c1083b8a2903ef5e8b528b3c359f390ad36d9bb120b1ce3aa3df64",
            uncles: ["0xd21d74cac9356eb7cfcc0d55edc326d72ba056a7f7bc7953ae94df3366e8b120"],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getUncleByBlockHashAndIndex"
              && jso.params.length === 2
              && jso.params[0] === "0xc6ef2fc5426d6ad6fd9e2a26abeab0aa2411b7ab17f30a99d3cb96aed1d1055b"
              && jso.params[1] === "0x0";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getUncleByBlockHashAndIndex") return expectedResult; });
          rpc.getUncleByBlockHashAndIndex("0xc6ef2fc5426d6ad6fd9e2a26abeab0aa2411b7ab17f30a99d3cb96aed1d1055b", 0, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getUncleByBlockNumberAndIndex", function (done) {
          var expectedResult = {
            difficulty: "0xd60a0c8",
            extraData: "0xd783010505846765746887676f312e372e33856c696e7578",
            gasLimit: "0x47e7c4",
            gasUsed: "0x5208",
            hash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
            logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            miner: "0xd490af05bf82ef6c6ba034b22d18c39b5d52cc54",
            mixHash: "0x36950956217410542fd06b88e474e6df2765d1d9eacc608fa55b834eca84a1fe",
            nonce: "0x4ea9835c2ac5857e",
            number: "0x186a0",
            parentHash: "0x8e535b16f5664fa509585626277e454c63ef4aeb402de0c41d9a364be69517e6",
            receiptsRoot: "0x4a4ca005b44989d4d4285970c830e61f6ee2b98d16b12b10277bb10232cde8f8",
            sha3Uncles: "0x9ae8bc973d19b0784e7b47340fad13edadc841b7fcf17894c002407c10befc08",
            size: "0x4a7",
            stateRoot: "0x69d017196eccb1d9f1ba578a1f00d7153226ed6da3843f181da43743fd79e2ad",
            timestamp: "0x5845709c",
            totalDifficulty: "0xac18c72ebbc",
            transactions: [{
              blockHash: "0xaa5550e8b9ce48e5f524bf680672f5eed6c60cfdf0bbe476613850a85d25f918",
              blockNumber: "0x186a0",
              from: "0x687422eea2cb73b5d3e242ba5456b782919afc85",
              gas: "0x4cb26",
              gasPrice: "0x4a817c800",
              hash: "0x7c85585eaf277bf4933f9702930263a451d62fba664be9c69f5cf891ba226e4a",
              input: "0x",
              nonce: "0x39c6",
              to: "0x787f88347aa3eefcc16e9e71c672138181bce266",
              transactionIndex: "0x0",
              value: "0xde0b6b3a7640000",
              v: "0x1c",
              r: "0x739344b05d1084ffffd7f11e7226a3ffa633422268a6c83c15bad56bcb6d3486",
              s: "0x2b10836b3b632b337e410bb9661799b2467c16bdf626aa1ad70bced750540196",
            }],
            transactionsRoot: "0x1c66bef1f1c1083b8a2903ef5e8b528b3c359f390ad36d9bb120b1ce3aa3df64",
            uncles: ["0xd21d74cac9356eb7cfcc0d55edc326d72ba056a7f7bc7953ae94df3366e8b120"],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_getUncleByBlockNumberAndIndex"
              && jso.params.length === 2
              && jso.params[0] === "0x29c"
              && jso.params[1] === "0x0";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getUncleByBlockNumberAndIndex") return expectedResult; });
          rpc.getUncleByBlockNumberAndIndex(668, 0, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getUncleCountByBlockHash", function (done) {
          var expectedResult = "0x0";
          server.addExpectation(function (jso) {
            return jso.method === "eth_getUncleCountByBlockHash"
              && jso.params.length === 1
              && jso.params[0] === "0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getUncleCountByBlockHash") return expectedResult; });
          rpc.getUncleCountByBlockHash("0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("getUncleCountByBlockNumber", function (done) {
          var expectedResult = "0x1";
          server.addExpectation(function (jso) {
            return jso.method === "eth_getUncleCountByBlockNumber"
              && jso.params.length === 1
              && jso.params[0] === "0xe8";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_getUncleCountByBlockNumber") return expectedResult; });
          rpc.getUncleCountByBlockNumber(232, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        // TODO: getWork

        it("hashrate", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_hashrate"; });
          server.addResponder(function (jso) { if (jso.method === "eth_hashrate") return "0x38a"; });
          rpc.hashrate(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "0x38a");
            server.assertExpectations();
            done();
          });
        });

        it("mining", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_mining"; });
          server.addResponder(function (jso) { if (jso.method === "eth_mining") return true; });
          rpc.mining(function (err, result) {
            assert.isNull(err);
            assert.isTrue(result);
            server.assertExpectations();
            done();
          });
        });

        it("newBlockFilter", function (done) {
          var expectedResult = "0x1";
          server.addExpectation(function (jso) {
            return jso.method === "eth_newBlockFilter"
              && jso.params.length === 0;
          });
          server.addResponder(function (jso) { if (jso.method === "eth_newBlockFilter") return expectedResult; });
          rpc.newBlockFilter(function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("newFilter", function (done) {
          var expectedResult = "0x1";
          server.addExpectation(function (jso) {
            return jso.method === "eth_newFilter"
              && jso.params.length === 1
              && jso.params[0].fromBlock === "0x1"
              && jso.params[0].toBlock === "latest"
              && jso.params[0].address === "0x8888f1f195afa192cfee860698584c030f4c9db1"
              && jso.params[0].topics[0] === "0x000000000000000000000000a94f5374fce5edbc8e2a8697c15331677e6ebf0b"
              && jso.params[0].topics[1] === null
              && jso.params[0].limit === "0x5";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_newFilter") return expectedResult; });
          rpc.newFilter({
            fromBlock: 1,
            toBlock: null,
            address: "0x8888f1f195afa192cfee860698584c030f4c9db1",
            topics: ["0x000000000000000000000000a94f5374fce5edbc8e2a8697c15331677e6ebf0b", null],
            limit: 5,
          }, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("newPendingTransactionFilter", function (done) {
          var expectedResult = "0x1";
          server.addExpectation(function (jso) {
            return jso.method === "eth_newPendingTransactionFilter"
              && jso.params.length === 0;
          });
          server.addResponder(function (jso) { if (jso.method === "eth_newPendingTransactionFilter") return expectedResult; });
          rpc.newPendingTransactionFilter(function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("protocolVersion", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_protocolVersion"; });
          server.addResponder(function (jso) { if (jso.method === "eth_protocolVersion") return "apple"; });
          rpc.protocolVersion(function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, "apple");
            server.assertExpectations();
            done();
          });
        });

        it("sendRawTransaction", function (done) {
          var expectedResult = "0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331";
          server.addExpectation(function (jso) {
            return jso.method === "eth_sendRawTransaction"
              && jso.params.length === 1
              && jso.params[0] === "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_sendRawTransaction") return expectedResult; });
          rpc.sendRawTransaction("d46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("sendTransaction", function (done) {
          var expectedResult = "0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331";
          server.addExpectation(function (jso) {
            return jso.method === "eth_sendTransaction"
              && jso.params.length === 1
              && jso.params[0].from === "0xb60e8dd61c5d32be8058bb8eb970870f07233155"
              && jso.params[0].to === "0xd46e8dd67c5d32be8058bb8eb970870f07244567"
              && jso.params[0].gas === "0x76c0"
              && jso.params[0].gasPrice === "0x9184e72a000"
              && jso.params[0].value === "0x9184e72a"
              && jso.params[0].data === "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675"
              && jso.params[0].nonce === "0x23";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_sendTransaction") return expectedResult; });
          rpc.sendTransaction({
            from: "0xb60e8dd61c5d32be8058bb8eb970870f07233155",
            to: "0xd46e8dd67c5d32be8058bb8eb970870f07244567",
            gas: 30400,
            gasPrice: 10000000000000,
            value: 2441406250,
            data: "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675",
            nonce: 35,
          }, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("sign", function (done) {
          var expectedResult = "0x2ac19db245478a06032e69cdbd2b54e648b78431d0a47bd1fbab18f79f820ba407466e37adbe9e84541cab97ab7d290f4a64a5825c876d22109f3bf813254e8628";
          server.addExpectation(function (jso) {
            return jso.method === "eth_sign"
              && jso.params.length === 2
              && jso.params[0] === "0xd1ade25ccd3d550a7eb532ac759cac7be09c2719"
              && jso.params[1] === "0x5363686f6f6c627573";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_sign") return expectedResult; });
          rpc.sign("0xd1ade25ccd3d550a7eb532ac759cac7be09c2719", "0x5363686f6f6c627573", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("signTransaction", function (done) {
          var expectedResult = {
            raw: "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675",
            tx: {
              hash: "0xc6ef2fc5426d6ad6fd9e2a26abeab0aa2411b7ab17f30a99d3cb96aed1d1055b",
              nonce: "0x0",
              blockHash: "0xbeab0aa2411b7ab17f30a99d3cb9c6ef2fc5426d6ad6fd9e2a26a6aed1d1055b",
              blockNumber: "0x7F110",
              transactionIndex: "0x1",
              from: "0x407d73d8a49eeb85d32cf465507dd71d507100c1",
              to: "0x85h43d8a49eeb85d32cf465507dd71d507100c1",
              value: "0x7f110",
              gas: "0x7f110",
              gasPrice: "0x09184e72a000",
              input: "0x603880600c6000396000f300603880600c6000396000f3603880600c6000396000f360",
            },
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_signTransaction"
              && jso.params.length === 1
              && jso.params[0].from === "0x407d73d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[0].to === "0x853f43d8a49eeb85d32cf465507dd71d507100c1"
              && jso.params[0].gas === "0x7f110"
              && jso.params[0].gasPrice === "0x9184e72a000"
              && jso.params[0].value === "0x7f110"
              && jso.params[0].data === "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675"
              && jso.params[0].nonce === "0x23";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_signTransaction") return expectedResult; });
          rpc.signTransaction({
            from: "0x407d73d8a49eeb85d32cf465507dd71d507100c1",
            to: "0x853f43d8a49eeb85d32cf465507dd71d507100c1",
            gas: 520464,
            gasPrice: 10000000000000,
            value: 520464,
            data: "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675",
            nonce: 35,
          }, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        // TODO: submitHashrate

        // TODO: submitWork

        it("subscribe", function (done) {
          var expectedResult = "0xcd0c3e8af590364c09d0fa6a1210faf5";
          server.addExpectation(function (jso) {
            return jso.method === "eth_subscribe"
              && jso.params.length === 2
              && jso.params[0] === "newHeads"
              && typeof jso.params[1] === "object" && Object.keys(jso.params[1]).length === 0;
          });
          server.addResponder(function (jso) { if (jso.method === "eth_subscribe") return expectedResult; });
          rpc.subscribe("newHeads", null, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("syncing (true)", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_syncing"; });
          server.addResponder(function (jso) {
            if (jso.method === "eth_syncing") {
              return { startingBlock: "0x384", currentBlock: "0x386", highestBlock: "0x454" };
            }
          });
          rpc.syncing(function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, { startingBlock: "0x384", currentBlock: "0x386", highestBlock: "0x454" });
            server.assertExpectations();
            done();
          });
        });

        it("syncing (false)", function (done) {
          server.addExpectation(function (jso) { return jso.method === "eth_syncing"; });
          server.addResponder(function (jso) { if (jso.method === "eth_syncing") return false; });
          rpc.syncing(function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, false);
            server.assertExpectations();
            done();
          });
        });

        it("uninstallFilter", function (done) {
          var expectedResult = true;
          server.addExpectation(function (jso) {
            return jso.method === "eth_uninstallFilter"
              && jso.params.length === 1
              && jso.params[0] === "0xb";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_uninstallFilter") return expectedResult; });
          rpc.uninstallFilter(11, function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });

        it("unsubscribe", function (done) {
          var expectedResult = true;
          server.addExpectation(function (jso) {
            return jso.method === "eth_unsubscribe"
              && jso.params.length === 1
              && jso.params[0] === "0xcd0c3e8af590364c09d0fa6a1210faf5";
          });
          server.addResponder(function (jso) { if (jso.method === "eth_unsubscribe") return expectedResult; });
          rpc.unsubscribe("0xcd0c3e8af590364c09d0fa6a1210faf5", function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });
      });

      describe("shh", function () {
        var server;
        beforeEach(function (done) {
          server = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          helpers.rpcConnect(transportType, transportAddress, done);
        });
        afterEach(function (done) {
          rpc.resetState();
          server.destroy(done);
        });

        it("newIdentity", function (done) {
          var expectedResult = "0xc931d93e97ab07fe42d923478ba2465f283f440fd6cabea4dd7a2c807108f651b7135d1d6ca9007d5b68aa497e4619ac10aa3b27726e1863c1fd9b570d99bbaf";
          server.addExpectation(function (jso) {
            return jso.method === "shh_newIdentity" && jso.params.length === 0;
          });
          server.addResponder(function (jso) {
            if (jso.method === "shh_newIdentity") {
              return expectedResult;
            }
          });
          rpc.shh.newIdentity(function (err, result) {
            assert.isNull(err);
            assert.deepEqual(result, expectedResult);
            server.assertExpectations();
            done();
          });
        });
      });

      describe("errors", function () {
        var server;
        beforeEach(function (done) {
          server = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          helpers.rpcConnect(transportType, transportAddress, done);
        });
        afterEach(function (done) {
          rpc.resetState();
          server.destroy(done);
        });

        it("calls callback with error on response with id", function (done) {
          server.addResponder(function (jso) { if (jso.method === "net_version") return new Error("error response"); });
          rpc.version(function (err, result) {
            assert.strictEqual(err.message, "error response");
            assert.isUndefined(result);
            done();
          });
        });
      });

      describe("high level", function () {
        var server;
        var interval;
        beforeEach(function (done) {
          server = helpers.createStubRpcServerWithRequiredResponders(transportType, transportAddress);
          helpers.rpcConnect(transportType, transportAddress, function () {
            interval = setInterval(function () { server.mine(); }, 1);
            done();
          });
        });
        afterEach(function (done) {
          rpc.resetState();
          clearInterval(interval);
          server.destroy(done);
        });

        it("callContractFunction no parameters", function (done) {
          var payload = {
            name: "getBranches",
            returns: "bytes32[]",
            from: "0x00bae5113ee9f252cceb0001205b88fad175461a",
            to: "0x482c57abdce592b39434e3f619ffc3db62ab6d01",
            params: [],
          };
          server.addExpectation(function (jso) {
            return jso.method === "eth_call"
              && jso.params.length === 2
              && jso.params[0].from === "0x00bae5113ee9f252cceb0001205b88fad175461a"
              && jso.params[0].to === "0x482c57abdce592b39434e3f619ffc3db62ab6d01"
              && jso.params[0].gas === "0x5d1420"
              && jso.params[0].gasPrice === undefined
              && jso.params[0].value === undefined
              && jso.params[0].data === "0x" + ethereumjsAbi.methodID("getBranches", []).toString("hex")
              && jso.params[1] === "latest";
          });
          server.addResponder(function (jso) {
            if (jso.method === "eth_call") {
              return "0x" + ethereumjsAbi.rawEncode(["uint256[]"], [[1, 100, 100000]]).toString("hex");
            }
          });
          rpc.callContractFunction(payload, function (err, result) {
            assert.strictEqual(result[0], "0x0000000000000000000000000000000000000000000000000000000000000001");
            assert.strictEqual(result[1], "0x0000000000000000000000000000000000000000000000000000000000000064");
            assert.strictEqual(result[2], "0x00000000000000000000000000000000000000000000000000000000000186a0");
            server.assertExpectations();
            done();
          });
        });

        it("transact pool not accepting", function (done) {
          function onSent() { }
          function onSuccess() { assert.isFalse(true, "onSuccess should not have been called"); }
          function onFailed(err) {
            assert.strictEqual(err.message, "Maximum number of transaction retry attempts exceeded");
            assert.strictEqual(err.hash, "0xbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf" + "0006");
            done();
          }
          server.addResponder(function (jso) { if (jso.method === "eth_call") return "0x12"; });
          server.addResponder(function (jso) { if (jso.method === "eth_getTransactionByHash") return null; });
          rpc.transact(createReasonableTransactPayload(), null, null, onSent, onSuccess, onFailed);
        });

        it("transact", function (done) {
          function onSent() {}
          function onSuccess(result) {
            assert.strictEqual(result.callReturn, "18");
            done();
          }
          function onFailed(error) {
            assert.isFalse(true, "onFailed should not have been called." + error);
          }
          server.addResponder(function (jso) {
            switch (jso.method) {
              case "eth_call":
                return "0x12";
              case "eth_getTransactionReceipt":
                return { status: "0x1", gasUsed: "0x2" };
              case "eth_getTransactionByHash":
                return {
                  from: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                  to: "0xdeadbabedeadbabedeadbabedeadbabedeadbabe",
                  data: "0xf85563ad",
                  gas: "0x5d1420",
                  hash: "0xbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf0001",
                  blockNumber: "0x1",
                  blockHash: "0xb10cb10cb10cb10cb10cb10cb10cb10cb10cb10cb10cb10cb10cb10cb10c000d",
                  transactionIndex: "0x1",
                  gasPrice: "0x12a05f200",
                };
            }
          });
          rpc.transact(createReasonableTransactPayload(), null, null, onSent, onSuccess, onFailed);
        });

        it("should send eth_estimateGas from transact", function (done) {
          function onSent() { }
          function onSuccess(result) {
            assert.strictEqual(result, "0x12345");
            done();
          }
          function onFailed(error) {
            assert.isFalse(true, "onFailed should not have been called: " + error);
          }
          server.addResponder(function (jso) {
            if (jso.method === "eth_estimateGas") return "0x12345";
          });
          var payload = createReasonableTransactPayload();
          payload.estimateGas = true;
          rpc.transact(payload, null, null, onSent, onSuccess, onFailed);
        });

        it("ensureLatestBlock", function (done) {
          clearInterval(interval);
          helpers.rpcConnect(transportType, transportAddress, function () {
            assert.isNotNull(rpc.getCurrentBlock());
            done();
          });
        });

        it("isUnlocked (locked)", function (done) {
          server.addResponder(function (jso) {
            if (jso.method === "eth_sign") {
              return new RPCError({ code: -32000, message: "account is locked" });
            }
          });
          rpc.isUnlocked("0x00bae5113ee9f252cceb0001205b88fad175461a", function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, false);
            done();
          });
        });

        it("isUnlocked (unlocked)", function (done) {
          server.addResponder(function (jso) {
            if (jso.method === "eth_sign") {
              return "0xa3f20717a250c2b0b729b7e5becbff67fdaef7e0699da4de7ca5895b02a170a12d887fd3b17bfdce3481f10bea41f45ba9f709d39ce8325427b57afcfc994cee1b";
            }
          });
          rpc.isUnlocked("0x00bae5113ee9f252cceb0001205b88fad175461a", function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, true);
            done();
          });
        });

        it("waitForNextBlocks", function (done) {
          var currentBlock = 5;
          constants.BLOCK_POLL_INTERVAL = 1;
          server.addExpectations(3, function (jso) { return jso.method === "eth_blockNumber"; });
          server.addResponder(function (jso) { if (jso.method === "eth_blockNumber") return "0x" + (currentBlock++).toString(16); });
          rpc.waitForNextBlocks(2, null, function (err, result) {
            assert.strictEqual(result, 7);
            server.assertExpectations();
            constants.BLOCK_POLL_INTERVAL = 30000;
            done();
          });
        });

        it("callOrSendTransaction", function (done) {
          var expectedResults = "0x" + ethereumjsAbi.rawEncode(["uint256[]"], [[1, 100, 100000]]).toString("hex");
          var payload = {
            name: "getBranches",
            returns: "bytes32[]",
            from: "0x00bae5113ee9f252cceb0001205b88fad175461a",
            to: "0x482c57abdce592b39434e3f619ffc3db62ab6d01",
            params: [],
          };
          server.addResponder(function (jso) { if (jso.method === "eth_call") return expectedResults; });
          rpc.callOrSendTransaction(payload, function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, expectedResults);
            done();
          });
        });

        it("gets the gas price of a transaction", function (done) {
          server.addExpectation(function (jso) {
            return jso.method === "eth_estimateGas"
              && jso.params[0].from === "0x00bae5113ee9f252cceb0001205b88fad175461a"
              && jso.params[0].to === "0x482c57abdce592b39434e3f619ffc3db62ab6d01"
              && jso.params[0].value === "0xfffffffff"
              && jso.params[1] === "latest";
          });
          var expectedResults = "0x12345";
          var payload = {
            estimateGas: true,
            name: "getBranches",
            returns: "bytes32[]",
            from: "0x00bae5113ee9f252cceb0001205b88fad175461a",
            to: "0x482c57abdce592b39434e3f619ffc3db62ab6d01",
            gas: "0xfffffffff",
            params: [],
          };
          server.addResponder(function (jso) { if (jso.method === "eth_estimateGas") return expectedResults; });
          rpc.callOrSendTransaction(payload, function (err, result) {
            assert.isNull(err);
            assert.strictEqual(result, expectedResults);
            done();
          });
        });

        it("can subscribe to new blocks", function (done) {
          rpc.getBlockStream().subscribeToOnBlockAdded(function (/* block */) { done(); });
        });

        it("can subscribe to new logs", function (done) {
          server.addResponder(function (jso) {
            if (jso.method === "eth_getLogs") return [{}];
          });
          rpc.getBlockStream().addLogFilter({});
          rpc.getBlockStream().subscribeToOnLogAdded(function (/*logs*/) { done(); });
        });

        it("can supply a log filter", function (done) {
          server.addResponder(function (jso) { if (jso.method === "eth_getLogs") return [{}]; });
          server.addExpectation(function (jso) {
            return jso.method === "eth_getLogs"
              && jso.params.length === 1
              && typeof jso.params[0] === "object"
              && jso.params[0].address === "0xbadf00d"
              && jso.params[0].topics instanceof Array
              && jso.params[0].topics.length === 1
              && jso.params[0].topics[0] === "0xdeadbeef";
          });
          rpc.getBlockStream().addLogFilter({ address: "0xbadf00d", topics: ["0xdeadbeef"] });
          rpc.getBlockStream().subscribeToOnLogAdded(function (/*logs*/) {
            server.assertExpectations();
            done();
          });
        });

        it("can unsubscribe from log filter", function (done) {
          server.addResponder(function (jso) { if (jso.method === "eth_getLogs") return [{}]; });
          var called = false;
          var token = rpc.getBlockStream().subscribeToOnLogAdded(function (/*logs*/) { called = true; });
          rpc.getBlockStream().unsubscribeFromOnLogAdded(token);
          rpc.getBlockStream().subscribeToOnBlockAdded(function (/*block*/) { done(called ? new Error("log handler was called") : undefined); });
        });

        it("can remove log filter", function (done) {
          server.addResponder(function (jso) {
            if (jso.method === "eth_getLogs") {
              done(new Error("should not be called"));
            }
          });
          var token = rpc.getBlockStream().addLogFilter({
            address: "0xbadf00d",
            topics: ["0xdeadbeef"],
          });
          rpc.getBlockStream().removeLogFilter(token);
          rpc.getBlockStream().subscribeToOnLogAdded(function (/*logs*/) {
            done(new Error("should not be called"));
          });
          setTimeout(done, 10);
        });
      });
    });
  }

  tests("IPC", (os.type() === "Windows_NT") ? "\\\\.\\pipe\\TestRPC" : "testrpc.ipc");
  tests("WS", "ws://localhost:1337");
  tests("HTTP", "http://localhost:1337");
});
