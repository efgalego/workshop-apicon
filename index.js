// Configuring Facebook Messenger Bot:
// https://medium.com/@ThomasBrd/in-this-quick-post-we-will-see-how-to-configure-and-quickstart-a-facebook-messenger-bot-plateform-86dcc013741d

require('dotenv').load();

var Botkit = require('botkit');
var express = require('express');
var fs = require('fs'); 
var https = require('https');
var url = require('url');

var middleware = require('botkit-middleware-watson')({
  username: process.env.CONVERSATION_USERNAME,
  password: process.env.CONVERSATION_PASSWORD,
  workspace_id: process.env.WORKSPACE_ID,
  url: process.env.CONVERSATION_URL || 'https://gateway.watsonplatform.net/conversation/api',
  version_date: '2017-05-26'
});

var controller = Botkit.facebookbot({
  debug: false,
  log: true,
  access_token: process.env.MESSENGER_ACCESS_TOKEN,
  verify_token: process.env.MESSENGER_VERIFY_TOKEN,
  app_secret: process.env.MESSENGER_APP_SECRET,
  validate_requests: true, // Refuse any requests that don't come from FB on your receive webhook, must provide FB_APP_SECRET in environment variables
});


var bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT || 5000, function(err,webserver) {
  controller.createWebhookEndpoints(controller.webserver, bot, function() {
      console.log('Bot initialization');
  });
});

controller.on('facebook_optin', function(bot, message) {
    bot.reply(message, 'Welcome to my app!');
});

controller.hears('testando', 'message_received', function(bot, message) {
  bot.reply(message,'Echo testando...!');
});

controller.hears(['.*'], 'message_received', function(bot, message) {
  controller.log('Request: '+ JSON.stringify(message));

  middleware.interpret(bot, message, function() {

    if (message.watsonError) {
      controller.log("Error: " + message.watsonError);
      bot.reply(message, "I'm sorry, but for technical reasons I can't respond to your message");
    } else {
      
      if (message.watsonData.output.action != null) {
        controller.log('Detected action: ' + message.watsonData.output.action);
        
        if (message.watsonData.output.action === 'get-status-device') {
          getStatus(message.watsonData.context.device, function(data) {
            var responseObject = JSON.parse(data);
            if (responseObject.valor != null) { 
              bot.reply(message, responseObject.valor);
            } else {
              bot.reply(message, 'Dispositivo não encontrado');
            }
          });
        } else if (message.watsonData.output.action === 'set-status-device') {
          setStatus(message.watsonData.context.device, message.watsonData.context.value);
        }
      }

      if (message.watsonData.output.text != null && message.watsonData.output.text.length > 0) {
        controller.log("Response: " + message.watsonData.output.text[0]);
        bot.reply(message, message.watsonData.output.text.join('\n'));
      }
    }
  });
});



function getStatus(device, callback) {
  var urlParse = url.parse(process.env.IOT_URL);
  var options = {
    host: urlParse.hostname,
    port: urlParse.port,
    path: '/api/coisa/' + device,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  var req = https.request(options, function(res) {
    res.setEncoding('utf-8');
    res.on('data', function(data) {
      console.log(data);
      callback(data);
    });

    res.on('end', function() {
      console.log('END rest call');
    });

    res.on('error', function(e) {
      console.error(e);
    });
  });

  req.end();
}

function setStatus(device, value) {
  var urlParse = url.parse(process.env.IOT_URL);
  var options = {
    host: urlParse.hostname,
    port: urlParse.port,
    path: '/api/coisa/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  var req = https.request(options, function(res) {
    res.setEncoding('utf-8');
    res.on('data', function(data) {
      console.log(data);
      callback(data);
    });

    res.on('end', function() {
      console.log('END rest call');
    });

    res.on('error', function(e) {
      console.error(e);
    });
  });

  var reqData = {
    deviceID: device,
    valor: value
  }

  req.write(JSON.stringify(reqData));
  req.end();
}
