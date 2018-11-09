//
var fs = require('fs');
const request = require('request');

var tokensParam = []; // require('../public/tokens');

var updateTokens = function () {
    request('https://raw.githubusercontent.com/WONDevelopment/explorer/master/public/tokens.json',
    // request('https://raw.githubusercontent.com/ethereumproject/explorer/master/public/tokens.json',
        { json: true }, (err, res, body) => {
        if (res.statusCode !== 200) {
            console.log('UpdateTokens: ', body);
            if (tokensParam.length) return;

            body = require('../public/tokens');
        }
        // console.info(res);
        var tokenAddrs = [];
        for (var index in body)
            tokenAddrs[index] = body[index].address;
        tokensParam[0] = tokenAddrs;
        tokensParam[1] = body;
        fs.writeFile('./public/tokens.json', JSON.stringify(body, null, 2), 'utf8', function(err) {
                if (err) console.error(err);
            });
    });

};

exports.updateTokens = updateTokens;
exports.tokensParam = tokensParam;