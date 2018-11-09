#!/usr/bin/env node

/*
    Endpoint for client interface with ERC-20 tokens
*/

var won = require('./web3relay').won;
var web3 = require('./web3relay').web3;
const abiDecoder = require('../lib/abi-decoder');

var async = require('async');

var mongoose = require( 'mongoose' );
var Transaction = mongoose.model( 'Transaction' );
var TransferToken     = mongoose.model( 'TransferToken' );

// var BigNumber = require('bignumber.js');
var wonUnits = require(__lib + "wonUnits.js");

const defaultABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"}];

var tokensParam = require('../public/tokens');
var tokenAddrs = [];
for (var index in tokensParam) tokenAddrs[index] = tokensParam[index].address;


module.exports = function (req, res) {
    console.log(req.body);

    var contractAddress = req.body.address;
    var index = tokenAddrs.indexOf(contractAddress);
    var curAbi;
    if (index !== -1) {
        curAbi = tokensParam[index].abi;
    } else {
        curAbi = defaultABI;
    }

    var Token = won.contract(curAbi).at(contractAddress);
    abiDecoder.addABI(curAbi);

    if (!("action" in req.body))
        res.status(400).send();
    else if (req.body.action === "info") {
        try {
            var actualBalance = won.getBalance(contractAddress);
            actualBalance = wonUnits.toWon(actualBalance, 'wei');
            var totalSupply = Token.totalSupply();
            // totalSupply = wonUnits.toWon(totalSupply, 'wei')*100;
            var decimals = Token.decimals();
            var owner = Token.owner();

            var name = Token.name();
            if (name.length > 64) {
                name = web3.toUtf8(name);
            }
            var symbol = Token.symbol();
            if (symbol.length > 64) {
                symbol = web3.toUtf8(symbol);
            }

            var count = won.getTransactionCount(contractAddress);
            var tokenData = {
                "balance": actualBalance,
                "total_supply": totalSupply,
                "count": count,
                "name": name,
                "symbol": symbol,
                "bytecode": won.getCode(contractAddress),
                "creator": owner
            }

            var addrFind = Transaction.find({ $and: [{"to": null}, {"from": owner}] }).lean(true);
            addrFind.exec(function (err, docs) {
                tokenData.transaction = docs[0].hash;
                res.write(JSON.stringify(tokenData));
                res.end();
            });
        } catch (e) {
            console.error(e);
        }
    } else if (req.body.action === "balanceOf") {
        var addr = req.body.user.toLowerCase();
        try {
            var tokens = Token.balanceOf(addr);
            // tokens = wonUnits.toWon(tokens, 'wei')*100;
            res.write(JSON.stringify({"tokens": tokens}));
            res.end();
        } catch (e) {
            console.error(e);
        }
    } else if (req.body.action === "transfer") {
        var start = 0;
        if (req.body.start) start = parseInt(req.body.start);

        var ctFind = TransferToken.find({'address': req.body.addr}).lean(true).sort('-blockNumber').skip(start).limit(MAX_ENTRIES);
        ctFind.exec(function (err, docs) {
            if (!docs.length){
                res.write(JSON.stringify([]));
            } else {
                var formatDocs = docs.map( function(doc) {
                    doc.amount = wonUnits.toWon(doc.amount, 'wei');
                    return doc;
                });
                res.write(JSON.stringify(formatDocs));
            }
            res.end();
        });
    } else if (req.body.action === "transaction") {
        var addr = req.body.addr.toLowerCase();
        var limit = parseInt(req.body.length);

        var options = { $and: [{'to': addr}, {'input': {$ne: '0x'}}] };
        var addrFind = Transaction.find(options).lean(true).sort('-blockNumber').limit(limit);
        addrFind.exec(function (err, docs) {
            var data;
            if (docs) {
                data = docs.map( function(doc) {
                    var obj = abiDecoder.decodeMethod(doc.input);
                    var conTx = {
                        "txHash": doc.hash,
                        "blockHash": doc.blockHash,
                        "amount": doc.value,
                        "from": doc.from,
                        "params": obj.params,
                        "gas": doc.gas,
                        "timestamp": doc.timestamp,
                        "type": obj.name
                    };
                    return conTx;
                });
            }

            res.write(JSON.stringify(data));
            res.end();
        });
    } else if (req.body.action === "count") {
        var addr = req.body.addr.toLowerCase();
        var data = {txCount: 0, transferCount: 0};

        async.waterfall([function (callback) {
            var options = {$and: [{'to': addr}, {'input': {$ne: '0x'}}]};
            Transaction.count(options, function (err, count) {
                if (!err && count) data.txCount = count;
                callback(null);
            });
        }, function (callback) {
            TransferToken.count({'address': addr}, function (err, count) {
                if (!err && count) data.transferCount = count;
                callback(null);
            });
        }], function (err) {
            if (err) data.err = err;
            res.write(JSON.stringify(data));
            res.end();
        });
    }

};

const MAX_ENTRIES = 20;