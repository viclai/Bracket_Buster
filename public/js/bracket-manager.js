var cheerio = require('cheerio');
var Bracket = require('./bracket');

/*
 * Creates a new BracketManager.
 * @class
 */
function BracketManager() {
  this.year = new Date().getFullYear();
  this.scrape_url = 'http://www.sports-reference.com/cbb/postseason/' +
    this.year + '-ncaa.html';
  this.bracket = new Bracket();
  this.region_id = {};
}

/*
 * Determines the winners of which regions play each other in the
 * Final Four. 'region1' will play 'region3', and 'region2' will play
 * 'region4' in the Final Four.
 */
BracketManager.prototype.id_region = function() {
  // TODO: sports-reference.com does not show which regions play each other,
  //       so for now, just assign region IDs arbitrarily.
  var i;
  for (i = 0; i < this.bracket.regions.length; i++) {
    this.region_id[this.bracket.regions[i]] = 'region' + (i + 1);
  }
};

/*
 * Populates the bracket data by extracting the relevant content from
 * the specified HTML.
 * @param {string} sHtml        - The HTML string containing bracket info.
 * @param {Object} oPredictions - The user's predictions.
 */
BracketManager.prototype.populate_data = function(sHtml, oPredictions = null) {
  var round_names;
  var final_4_teams = {};
  var $;
  var region;
  var regions = {};
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
  var final_4_team;
  var manager = this;
  var national;

  $ = cheerio.load(sHtml);

  if ($('#brackets > div').length == 5) {
    $('#brackets > div').each(function(i, e) { // Regional bracket

      region = $(this).attr('id');
      
      if (region == 'national') {
        national = $(this);

      } else { // east, west, midwest, south

        manager.bracket.add_region(region);
        regions[region] = {};
        regions[region]['name'] = region;
        round_names = Object.keys(manager.bracket.preliminary_rounds);

        rounds = $(this).children('#bracket').first().children('.round');
        //////////////////////////////
        // ROUNDS
        //////////////////////////////
        rounds.each(function(ii, ee) {

          round = round_names[ii];
          games = $(this).children('div');

          if (round !== 'Final Four') {

            regions[region][round] = [];

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
                team['name'] = manager.bracket.abbreviate(team_name.text());
                team_score = $(this).children('a').next();
                if (team_score.length != 0) {
                  team['score'] = parseInt(team_score.text());
                }

                game['team' + (iiii + 1)] = team;
              });

              regions[region][round].push(game);
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

      }
    });
  } else {

    console.log('ERROR: Webpage HTML may have changed.' +
      'There should be div sections for 4 regions and national.');

  }
  
  this.id_region(); // TODO: Determine region IDs (i.e. region1, region2, ...)
  this.bracket.regions.forEach(function(reg) {
    var i;
    var j;
    var rounds = Object.keys(manager.bracket.preliminary_rounds);

    for (i = 0; i < rounds.length - 1; i++) {
      for (j = 0;
           j < manager.bracket.data['regions'][manager.region_id[reg]][rounds[i]].length;
           j++) {

        if (oPredictions == null) {
          manager.bracket.data['regions'][manager.region_id[reg]][rounds[i]][j] = {
            "prediction" : {
              'team1' : {
                "seed"  : "&nbsp;",
                "name"  : "&nbsp;",
                "score" : " " // TODO: Irrelevant but leave for now for consistency
              },
              "team2" : {
                "seed"  : "&nbsp;",
                "name"  : "&nbsp;",
                "score" : " " // TODO: Irrelevant but leave for now for consistency
              }
            },
            "result" : regions[reg][rounds[i]][j]
          };
        } else {
          manager.bracket.data['regions'][manager.region_id[reg]][rounds[i]][j] = {
            "prediction" : oPredictions[manager.region_id[reg]][rounds[i]][j],
            "result"     : regions[reg][rounds[i]][j]
          };
        }

        if (rounds[i] == '1st Round') {
          manager.bracket.user_data[manager.region_id[reg]][rounds[i]][j] =
            regions[reg][rounds[i]][j];
          manager.bracket.data['regions'][manager.region_id[reg]][rounds[i]][j]['prediction'] =
            regions[reg][rounds[i]][j];
        }
      }
    }
  });

  if (typeof national != 'undefined') {

    round_names = Object.keys(manager.bracket.final_rounds);
    manager.bracket.data['regions']['national'] = {};

    rounds = national.children('#bracket').first().children('.round');
    //////////////////////////////
    // ROUNDS
    //////////////////////////////
    rounds.each(function(ii, ee) {

      round = round_names[ii];
      games = $(this).children('div');

      //manager.bracket.data['regions']['national'][round] = {};
      manager.bracket.data['regions']['national'][round] = {};
      manager.bracket.data['regions']['national'][round]['result'] = {};
      manager.bracket.data['regions']['national'][round]['prediction'] = {};

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

            final_4_region = manager.region_id[final_4_teams[team_name]];
            if (final_4_region == 'region1')
              final_4_team = 'team1';
            else if (final_4_region == 'region2')
              final_4_team = 'team3';
            else if (final_4_region == 'region3')
              final_4_team = 'team2';
            else if (final_4_region == 'region4')
              final_4_team = 'team4';

            manager.bracket.data['regions']['national'][round]['result'][final_4_team] = {};
            manager.bracket.data['regions']['national'][round]['result'][final_4_team]['seed'] = seed;
            manager.bracket.data['regions']['national'][round]['result'][final_4_team]['name'] =
              manager.bracket.abbreviate(team_name);
            if (team_score.length != 0) {
              manager.bracket.data['regions']['national'][round]['result'][final_4_team]['score'] =
                parseInt(team_score.text());
            }
            
            if (oPredictions != null) {
              manager.bracket.data['regions']['national'][round]['prediction'][final_4_team] =
                oPredictions['national'][round][final_4_team]
            } else {
              manager.bracket.data['regions']['national'][round]['prediction'][final_4_team] = {
                "name"  : "&nbsp;",
                "seed"  : "&nbsp;",
                "score" : " " // TODO: Irrelevant but leave for now for consistency
              };
            }

          } else if (round === 'Championship') {

            final_4_region = manager.region_id[final_4_teams[team_name]];
            if (final_4_region == 'region1' || final_4_region == 'region3') {
              final_4_team = 'team1';
            } else { // region2 or region4
              final_4_team = 'team2';
            }

            manager.bracket.data['regions']['national'][round]['result'][final_4_team] = {};
            manager.bracket.data['regions']['national'][round]['result'][final_4_team]['seed'] = seed;
            manager.bracket.data['regions']['national'][round]['result'][final_4_team]['name'] =
              manager.bracket.abbreviate(team_name);
            if (team_score.length != 0) {
              manager.bracket.data['regions']['national'][round]['result'][final_4_team]['score'] =
                parseInt(team_score.text());
            }
            
            if (oPredictions != null) {
              manager.bracket.data['regions']['national'][round]['prediction'][final_4_team] =
                oPredictions['national'][round][final_4_team]
            } else {
              manager.bracket.data['regions']['national'][round]['prediction'][final_4_team] = {
                "name"  : "&nbsp;",
                "seed"  : "&nbsp;",
                "score" : " " // TODO: Irrelevant but leave for now for consistency
              };
            }

          } else if (round === 'Champion') {

            manager.bracket.data['regions']['national'][round]['result']['team1'] = {};
            manager.bracket.data['regions']['national'][round]['result']['team1']['seed'] = seed;
            manager.bracket.data['regions']['national'][round]['result']['team1']['name'] =
              manager.bracket.abbreviate(team_name);
            if (team_score.length != 0) {
              manager.bracket.data['regions']['national'][round]['result']['team1']['score'] =
                parseInt(team_score.text());
            }
            
            if (oPredictions != null) {
              manager.bracket.data['regions']['national'][round]['prediction']['team1'] =
                oPredictions['national'][round]['team1']
            } else {
              manager.bracket.data['regions']['national'][round]['prediction']['team1'] = {
                "name"  : "&nbsp;",
                "seed"  : "&nbsp;",
                "score" : " " // TODO: Irrelevant but leave for now for consistency
              };
            }
          }
                      
        });

      });

    });
  }
  this.bracket.data['empty_bracket'] = JSON.stringify(this.bracket.user_data);
};

module.exports = BracketManager;
