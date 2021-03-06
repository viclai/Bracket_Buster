var request = require('request');
var cors = require('cors');
var uuid = require('uuid');
var url = require('url');
var BracketManager = require('../public/js/bracket-manager.js');

// This is the heart of your HipChat Connect add-on. For more information,
// take a look at
// https://developer.atlassian.com/hipchat/tutorials/getting-started-with-atlassian-connect-express-node-js
module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function (req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL
  // is specified in `addon.json`.
  app.get('/',
    function (req, res) {
      // Use content-type negotiation to choose the best way to respond
      res.format({
        // If the request content-type is text-html, it will decide which to
        // serve up
        'text/html': function () {
          var homepage = url.parse(addon.descriptor.links.homepage);
          if (homepage.hostname === req.hostname
              && homepage.path === req.path) {
            res.render('homepage', addon.descriptor);
          } else {
            res.redirect(addon.descriptor.links.homepage);
          }
        },
        // This logic is here to make sure that the `addon.json` is always
        // served up when requested by the host
        'application/json': function () {
          res.redirect('/atlassian-connect.json');
        }
      });
    }
  );

  // This is an example route that's used by the default for the configuration
  // page
  // https://developer.atlassian.com/hipchat/guide/configuration-page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function (req, res) {
      // The `addon.authenticate()` middleware populates the following:
      // * req.clientInfo: useful information about the add-on client such as
      //   the clientKey, oauth info, and HipChat account info
      // * req.context: contains the context data accompanying the request like
      //   the roomId
      res.render('config', req.context);
    }
  );

  // This is an example glance that shows in the sidebar
  // https://developer.atlassian.com/hipchat/guide/glances
  app.get('/glance',
    cors(),
    addon.authenticate(),
    function (req, res) {
      // Displayed in sidebar when addon is installed
      res.json({
        "label": {
          "type": "html",
          "value": "Brackets"
        },
        "status": {
          "type": "lozenge",
          "value": {
            "label": "NEW",
            "type": "error"
          }
        }
      });
    }
  );

  // This is an example end-point that you can POST to update the glance info
  // Room update API: https://www.hipchat.com/docs/apiv2/method/room_addon_ui_update
  // Group update API: https://www.hipchat.com/docs/apiv2/method/addon_ui_update
  // User update API: https://www.hipchat.com/docs/apiv2/method/user_addon_ui_update
  app.post('/update_glance',
    cors(),
    addon.authenticate(),
    function (req, res) {
      // TODO: Display status for whether or not there are any games being
      //       played today. Also display status for any changes to the
      //       leaderboard.
      res.json({
        "label": {
          "type": "html",
          "value": "Hello World!"
        },
        "status": {
          "type": "lozenge",
          "value": {
            "label": "All good",
            "type": "success"
          }
        }
      });
    }
  );

  // This is an example sidebar controller that can be launched when clicking
  // on the glance.
  // https://developer.atlassian.com/hipchat/guide/sidebar
  app.get('/sidebar',
    addon.authenticate(),
    function (req, res) {
      // TODO: Pass context data for current games being played and leaderboard
      res.render('sidebar', {
        identity: req.identity
      });
    }
  );

  // This is a dialog controller that can be launched when clicking on
  // the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog
  app.get('/dialog',
    addon.authenticate(),
    function (req, res) {
      var view_context = {};
      var bracket_manager = new BracketManager();
      
      // TODO: Handle case where user decides to open in the bracket in a new
      //       tab. In this case, there will not be any 'Save' button, so
      //       the radio input buttons may have to be disabled. This case may
      //       be implemented by using a passed parameter in query string.

      request(bracket_manager.scrape_url, function (error, response, html) {
        if (!error && response.statusCode == 200) {
          addon.settings.get(
            'bracket-picks',
            req.clientInfo.clientKey).then(function(pred_data) {
              bracket_manager.populate_data(html, pred_data);
              //bracket_manager.bracket.print_data(); // DEBUG
              if (Object.keys(bracket_manager.bracket.data).length !== 0) {
                view_context['bracketData'] = bracket_manager.bracket.data;
              }
              //view_context['bracketData'] = bracket_manager.bracket.unavailable_bracket_state(); // DEBUG
              //view_context['bracketData'] = bracket_manager.bracket.available_bracket_state(); // DEBUG
              //view_context['bracketData'] = bracket_manager.bracket.set_bracket_state(); // DEBUG
              view_context['identity'] = req.identity;
              res.render('dialog', view_context);
            }
          );
        } else {

          console.log('ERROR fetching HTML');
          view_context['bracketData'] = {};
          view_context['bracketData']['state'] = {};
          view_context['bracketData']['unavailable'] = true;

        }
      });
    }
  );

  // This is an endpoint used to store/save a user's bracket picks.
  app.post('/bracket_pick',
    addon.authenticate(),
    function (req, res) {
      // Use addon.settings to store bracket picks
      addon.settings.set(
        'bracket-picks', // TODO: 'bracket-picks-' + req.identity.userId
        req.body.data,
        req.clientInfo.clientKey
      ).then(function() {
        addon.settings.get(
          'bracket-picks',
          req.clientInfo.clientKey).then(function(data) {
            console.log('stored', JSON.stringify(data));
          }
        );
        res.sendStatus(200);
      });
    }
  );

  // Sample endpoint to send a card notification back into the chat room
  // See https://developer.atlassian.com/hipchat/guide/sending-messages
  app.post('/send_notification',
    addon.authenticate(),
    function (req, res) {
      var card = {
        "style": "link",
        "url": "https://www.hipchat.com",
        "id": uuid.v4(),
        "title": req.body.messageTitle,
        "description": "Great teams use HipChat: Group and private chat, file sharing, and integrations",
        "icon": {
          "url": "https://hipchat-public-m5.atlassian.com/assets/img/hipchat/bookmark-icons/favicon-192x192.png"
        }
      };
      var msg = '<b>' + card.title + '</b>: ' + card.description;
      var opts = { 'options': { 'color': 'yellow' } };
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, msg, opts, card);
      res.json({ status: "ok" });
    }
  );

  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/webhook',
    addon.authenticate(),
    function (req, res) {
      hipchat.sendMessage(
        req.clientInfo,
        req.identity.roomId,
        'Bracket not available yet.').then(function (data) {
          res.sendStatus(200);
        }
      );
    }
  );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function (clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' +
      addon.descriptor.name + ' add-on has been installed in this room'
    );
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function (id) {
    // TODO: See if there's a better method that can be used that does not
    //       expose the API of jugglingdb. Something similar to
    //       addon.settings.set() would be nice.
    addon.settings.schema.models.AddonSettings.all(
      {"where" : {"clientKey" : id}}, function(err, rows) {
        if (err) {
          console.log("ERROR retrieving rows from database with client key",
            id);
        } else {
          rows.forEach(function(row) {
            row.destroy();
          });
          console.log("Deleted all rows associated with client key", id);
        }
      }
    );
  });

};
