var express     = require('express')
  , Twitter     = require('ntwitter')
	, sys 				= require('sys')
	, domainr 		= require('Domai.nr')
  , request     = require('request')
  

if (process.env.USER === "cnnr") {
  config      = require('./config')
}


var app = express.createServer(express.logger()),
    port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});

var twit = new Twitter({
    consumer_key: process.env['CONSUMER_KEY'] || config.CONSUMER_KEY
  , consumer_secret: process.env['CONSUMER_SECRET'] || config.CONSUMER_SECRET
  , access_token_key: process.env['TOKEN_KEY'] || config.TOKEN_KEY
  , access_token_secret: process.env['TOKEN_SECRET'] || config.TOKEN_SECRET
})


 twit
    .verifyCredentials(function (err, data) {
      if (err) { console.log(err) }
    })
    .stream('statuses/filter', {'track':'@checkthisdomain'}, function(stream) {
      stream.on('data', function (tweet) {

        if (tweet.in_reply_to_screen_name === "checkthisdomain" && !tweet.retweeted) {

          var shortened_url     = encodeURIComponent( tweet.text.split(' ')[1] )
            , userToRespondTo   = tweet.user.screen_name
            , expanded_url;


          request("http://expandurl.appspot.com/expand?url=" + shortened_url, function(error, response, body) {
            if (!error) {
              var json_body = JSON.parse( body )
              
              expanded_url = decodeURIComponent( json_body.end_url ) // like: http://example.com

              console.log("1: " + expanded_url)

              expanded_url = expanded_url.substr(expanded_url.indexOf('://')+3) // like: example.com

              console.log("2: " + expanded_url)

              domainr.info(expanded_url, function(responseFromDomainr) {
         
                switch (responseFromDomainr.availability) {
                  case "available":
                    twit.updateStatus('@' + userToRespondTo + " " + expanded_url + " is available! You can register it here: " + responseFromDomainr.register_url + " <3", function(err, data) {
                      if (err) { console.log(err) }
                    })
                  break;

                  case "taken":
                    twit.updateStatus('@' + userToRespondTo + " " + expanded_url + " is taken =(", function(err, data) {
                      if (err) { console.log(err) }
                    })
                    break;

                  case "unknown":
                    twit.updateStatus('@' + userToRespondTo + " hmmm. Domai.nr says it's 'unknown'. Why don't you check on their site? http://domai.nr", function(err, data) {
                      if (err) { console.log(err) }
                    })
                    break;
                }


              })


            }
          })


        }
      });
    });