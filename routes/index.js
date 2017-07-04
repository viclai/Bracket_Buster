var request = require('request');
var cors = require('cors');
var uuid = require('uuid');
var url = require('url');
var cheerio = require('cheerio')

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
          if (homepage.hostname === req.hostname && homepage.path === req.path) {
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
      // * req.clientInfo: useful information about the add-on client such as the
      //   clientKey, oauth info, and HipChat account info
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
      res.render('sidebar', {
        identity: req.identity
      });
    }
  );

  // This is an example dialog controller that can be launched when clicking
  // on the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog
  app.get('/dialog',
    addon.authenticate(),
    function (req, res) {
      /*
       * Prints the bracket data to console.
       */
      var print_data = function(oBracketData) {
        for (region in oBracketData) {
          console.log(region + ':');
          if (region == 'national') {
            for (round in oBracketData[region]) {
              console.log('\t' + round + ':');
              for (p1 in oBracketData[region][round]) {
                for (p2 in oBracketData[region][round][p1]) {
                  console.log('\t\t' + p2 + ': ' + oBracketData[region][round][p1][p2]);
                }
              }
              console.log('\n');
            }
          } else {
            for (round in oBracketData[region]) {
              console.log('\t' + round + ':');
              oBracketData[region][round].forEach(function(game) {
                for (team in game) {
                  for (attr in game[team]) {
                    console.log('\t\t' + attr + ': ' + game[team][attr]);
                  }
                }
                console.log('\n');
              });
            }
          }
        }
      };

      /*
       * Determines if the string is a valid region.
       * @returns {boolean} whether the string value is a region
       */
      var is_region = function(sId) {
        var regions = [
          'east',
          'midwest',
          'south',
          'west'
        ];
        var i;

        for (i = 0; i < regions.length; i++) {
          if (sId == regions[i])
            return true;
        }
        return false;
      };

      /*
       * Abbreviates a team name.
       * @ returns {string} abbreviated name
       */
      var abbreviate = function(sName) {
        var parts = sName.split(" ");
        var name_abbrs = {
          'florida gulf coast'        : 'FGC',
          'north carolina-wilmington' : 'UNCW'
        };
        var word_abbrs = {
          'state'          : 'St.',
          'saint'          : 'St.',
          'north'          : 'N.',
          'northern'       : 'N.',
          'west'           : 'W.',
          'south'          : 'S.',
          'tennessee'      : 'Tenn.',
          'mount'          : 'Mt.'
        };
        var i;
        var lower;

        if (sName.toLowerCase() in name_abbrs) {
          return name_abbrs[sName.toLowerCase()];
        }

        for (i = 0; i < parts.length; i++) {
          lower = parts[i].toLowerCase();
          if (lower in word_abbrs) {
            parts[i] = word_abbrs[lower];
          }
        }

        sName = '';
        for (i = 0; i < parts.length; i++) {
          sName += parts[i] + ' ';
        }
        sName = sName.slice(0, -1);
        return sName;
      }

      /*
       * Web scrapes the HTML content from the website with the tournament
       * bracket information.
       */
      var web_scrape = function() {
        var year = 2017; // TODO: Determine year from current date
        var site = 'http://www.sports-reference.com/cbb/postseason/' +
          year + '-ncaa.html';
        var round_names;
        var info = {};
        var final_4_teams = {};
        var $;
        var region;
        var round;
        var rounds;
        var game;
        var games;
        var team;
        var teams;
        var team_name;
        var team_score;
        var seed;
        var final_4_region;
        var view_context = {};

        request(site, function (error, response, html) {
          if (!error && response.statusCode == 200) {

            $ = cheerio.load(html);
            $('#brackets > div').each(function(i, e) { // Regional bracket

              region = $(this).attr('id');
              info[region] = {};
              if (is_region(region)) {

                round_names = [
                  '1st Round',
                  '2nd Round',
                  'Sweet 16',
                  'Elite 8',
                  'Final Four'
                ];

                rounds = $(this).children('#bracket').first().children('.round');
                //////////////////////////////
                // ROUNDS
                //////////////////////////////
                rounds.each(function(ii, ee) {

                  round = round_names[ii];
                  games = $(this).children('div');

                  if (round !== 'Final Four') {

                    info[region][round] = [];

                    ///////////////////////////////
                    // GAMES
                    ///////////////////////////////
                    games.each(function(iii, eee) {

                      game = {};

                      teams = $(this).children('div');
                      /////////////////////////////////
                      // TEAMS
                      /////////////////////////////////
                      teams.each(function(iiii, eeee) {
                        team = {};

                        seed = $(this).children('span').first();
                        if (seed.text() != '') {
                          team['seed'] = parseInt(seed.text());
                        } else {
                          team['seed'] = '';
                        }
                        
                        team_name = $(this).children('a').first();
                        team['name'] = abbreviate(team_name.text());
                        team_score = $(this).children('a').next();//team_name.next();
                        if (team_score.length != 0) {
                          team['score'] = parseInt(team_score.text());
                        }

                        game['team' + (iiii + 1)] = team;
                      });

                      info[region][round].push(game);
                    });

                  } else { // Final Four

                    ///////////////////////////////
                    // GAMES
                    ///////////////////////////////
                    games.each(function(iii, eee) {

                      teams = $(this).children('div');
                      /////////////////////////////////
                      // TEAMS
                      /////////////////////////////////
                      teams.each(function(iiii, eeee) {
                        team_name = $(this).children('a').first();
                        final_4_teams[team_name.text()] = region;
                      });

                    });

                  }
                });

              } else if (region == 'national') {

                round_names = [
                  'Final Four',
                  'Championship',
                  'Champion'
                ];

                rounds = $(this).children('#bracket').first().children('.round');
                //////////////////////////////
                // ROUNDS
                //////////////////////////////
                rounds.each(function(ii, ee) {

                  round = round_names[ii];
                  games = $(this).children('div');

                  info[region][round] = {};

                  ///////////////////////////////
                  // GAMES
                  ///////////////////////////////
                  games.each(function(iii, eee) {

                    teams = $(this).children('div');
                    /////////////////////////////////
                    // TEAMS
                    /////////////////////////////////
                    teams.each(function(iiii, eeee) {

                      team_name = $(this).children('a').first();
                      team_score = team_name.next();
                      team_name = team_name.text();
                      seed = parseInt($(this).children('span').text());

                      if (round === 'Final Four') {

                        // Assumes regions were processed first
                        final_4_region = final_4_teams[team_name];
                        info[region][round][final_4_region] = {};
                        info[region][round][final_4_region]['seed'] = seed;
                        info[region][round][final_4_region]['name'] =
                          abbreviate(team_name);
                        if (team_score.length != 0) {
                          info[region][round][final_4_region]['score'] =
                            parseInt(team_score.text());
                        }

                      } else if (round === 'Championship') {

                        team = 'team' + (iiii + 1);
                        info[region][round][team] = {};
                        info[region][round][team]['seed'] = seed;
                        info[region][round][team]['name'] =
                          abbreviate(team_name);
                        if (team_score.length != 0) {
                          info[region][round][team]['score'] =
                            parseInt(team_score.text());
                        }

                      } else if (round === 'Champion') {

                        info[region][round]['team'] = {};
                        info[region][round]['team']['seed'] = seed;
                        info[region][round]['team']['name'] =
                          abbreviate(team_name);
                        if (team_score.length != 0) {
                          info[region][round]['team']['score'] =
                            parseInt(team_score.text());
                        }

                      }
                      
                    });

                  });

                });
                
                //print_data(info);
                if (Object.keys(info).length !== 0) {
                  view_context['bracketData'] = info;
                }
                view_context['identity'] = req.identity;
                res.render('dialog', view_context);

              } else {

                console.log('ERROR matching region: Webpage HTML may have changed.');

              }
            });
          } else {

            console.log('ERROR fetching HTML');

          }
        });
      };

      web_scrape();
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
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Bracket not available yet.')
        .then(function (data) {
          res.sendStatus(200);
        });
    }
  );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function (clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' +
      addon.descriptor.name + ' add-on has been installed in this room');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function (id) {
    addon.settings.client.keys(id + ':*', function (err, rep) {
      rep.forEach(function (k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
