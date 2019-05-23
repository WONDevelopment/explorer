#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/
var BigNumber = require('bignumber.js');
var wonUnits = require(__lib + "wonUnits.js");
var getSigner = require(__lib + "blockMiner.js");

var getLatestBlocks = require('./index').getLatestBlocks;
var filterBlocks = require('./filters').filterBlocks;
var filterTrace = require('./filters').filterTrace;

const abi = require('./abi');

var wonWeb3 = require('../localweb3').wonWeb3;
// var newBlocks = web3.won.filter("latest");
// var newTxs = web3.won.filter("pending");

exports.data = function(req, res){
  console.log(req.body)

  if ("tx" in req.body) {
    var txHash = req.body.tx.toLowerCase();

      wonWeb3.won.getTransaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TxWeb3 error :" + err)
        if (!tx) {
            wonWeb3.won.getBlock(txHash, function(err, block) {
            if(err || !block) {
              console.error("BlockWeb3 error :" + err)
              res.write(JSON.stringify({"error": true}));
            } else {
              console.log("BlockWeb3 found: " + txHash)
              res.write(JSON.stringify({"error": true, "isBlock": true}));
            }
            res.end();
          });
        } else {
          res.write(JSON.stringify({"error": true}));
          res.end();
        }
      } else {
        var ttx = tx;
        ttx.value = wonUnits.toWon( new BigNumber(tx.value), "wei");
        // get tx status from receipt
          wonWeb3.won.getTransactionReceipt(tx.hash, function(err, txr) {
            ttx.status = txr.status;
            ttx.gasUsed = txr.gasUsed;
            //get timestamp from block
            var block = wonWeb3.won.getBlock(tx.blockNumber, function(err, block) {
              if (!err && block)
                ttx.timestamp = block.timestamp;

              if (tx.to && ttx.input != "0x") {
                  var bytecode = wonWeb3.won.getCode(tx.to);
                  if (bytecode.length > 2) {
                      ttx.isContract = true;
                      var curAbi = abi.abiInfo(tx.to);
                      ttx.inputJson = abi.decode(tx.input);
                      if (ttx.inputJson) {
                          var tokenObj = wonWeb3.won.contract(curAbi).at(tx.to);
                          ttx.tokenName = wonWeb3.toUtf8(tokenObj.name());
                          if (ttx.inputJson.name == 'transfer') {
                              ttx.tokenNumber = wonUnits.toWon(ttx.inputJson.params[1].value, "wei");
                          }
                      }
                  }
              }
              res.write(JSON.stringify(ttx));
              res.end();
            });
        });
      }
    });

  } else if ("tx_trace" in req.body) {
    var txHash = req.body.tx_trace.toLowerCase();

      wonWeb3.trace.transaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterTrace(tx)));
      }
      res.end();
    });
  } else if ("addr_trace" in req.body) {
    var addr = req.body.addr_trace.toLowerCase();
    // need to filter both to and from
    // from block to end block, paging "toAddress":[addr], 
    // start from creation block to speed things up 
    // TODO: store creation block
    var filter = {"fromBlock":"0x1d4c00", "toAddress":[addr]};
      wonWeb3.trace.filter(filter, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterTrace(tx)));
      }
      res.end();
    }) 
  } else if ("addr" in req.body) {
    var addr = req.body.addr.toLowerCase();
    var options = req.body.options;

    var addrData = {};

    if (options.indexOf("balance") > -1) {
      try {
        addrData["balance"] = wonWeb3.won.getBalance(addr);
        addrData["balance"] = wonUnits.toWon(addrData["balance"], 'wei');
      } catch(err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("count") > -1) {
      try {
         addrData["count"] = wonWeb3.won.getTransactionCount(addr);
      } catch (err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("bytecode") > -1) {
      try {
         addrData["bytecode"] = wonWeb3.won.getCode(addr);
         if (addrData["bytecode"].length > 2) 
            addrData["isContract"] = true;
         else
            addrData["isContract"] = false;
      } catch (err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
   
    res.write(JSON.stringify(addrData));
    res.end();


  } else if ("block" in req.body) {
    var blockNumOrHash;
    if (/^(0x)?[0-9a-f]{64}$/i.test(req.body.block.trim())) {
        blockNumOrHash = req.body.block.toLowerCase();
    } else {
        blockNumOrHash = parseInt(req.body.block);
    }

      wonWeb3.won.getBlock(blockNumOrHash, function(err, block) {
      if(err || !block) {
        console.error("BlockWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        block.miner = getSigner(block);
        block.minerName = config.settings.signers[block.miner];
        res.write(JSON.stringify(filterBlocks(block)));
      }
      res.end();
    });

    /* 
    / TODO: Refactor, "block" / "uncle" determinations should likely come later
    / Can parse out the request once and then determine the path.
    */
  } else if ("uncle" in req.body) {
    var uncle = req.body.uncle.trim();
    var arr = uncle.split('/');
    var blockNumOrHash; // Ugly, does the same as blockNumOrHash above
    var uncleIdx = parseInt(arr[1]) || 0;

    if (/^(?:0x)?[0-9a-f]{64}$/i.test(arr[0])) {
      blockNumOrHash = arr[0].toLowerCase();
      console.log(blockNumOrHash)
    } else {
      blockNumOrHash = parseInt(arr[0]);
    }

    if (typeof blockNumOrHash == 'undefined') {
      console.error("UncleWeb3 error :" + err);
      res.write(JSON.stringify({"error": true}));
      res.end();
      return;
    }

      wonWeb3.won.getUncle(blockNumOrHash, uncleIdx, function(err, uncle) {
      if(err || !uncle) {
        console.error("UncleWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterBlocks(uncle)));
      }
      res.end();
    });

  } else if ("action" in req.body) {
    if (req.body.action == 'hashrate') {
        wonWeb3.won.getBlock('latest', function(err, latest) {
        if(err || !latest) {
          console.error("StatsWeb3 error :" + err);
          res.write(JSON.stringify({"error": true}));
          res.end();
        } else {
          console.log("StatsWeb3: latest block: " + latest.number);
          var checknum = latest.number - 100;
          if(checknum < 0)
            checknum = 0;
          var nblock = latest.number - checknum;
            wonWeb3.won.getBlock(checknum, function(err, block) {
            if(err || !block) {
              console.error("StatsWeb3 error :" + err);
              res.write(JSON.stringify({"blockHeight": latest.number, "difficulty": latest.difficulty, "blockTime": 0, "hashrate": 0 }));
            } else {
              console.log("StatsWeb3: check block: " + block.number);
              var blocktime = (latest.timestamp - block.timestamp) / nblock;
              var hashrate = latest.difficulty / blocktime;
              res.write(JSON.stringify({"blockHeight": latest.number, "difficulty": latest.difficulty, "blockTime": blocktime, "hashrate": hashrate }));
            }
            res.end();
          });
        }
      });
    } else {
      console.error("Invalid Request: " + action);
      res.status(400).send();
    }
  } else {
    console.error("Invalid Request: " + action);
    res.status(400).send();
  }

};