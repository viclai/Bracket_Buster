var cheerio = require('cheerio');
var Bracket = require('./bracket');

function BracketManager() {
  this.year = new Date().getFullYear();
  this.scrape_url = 'http://www.sports-reference.com/cbb/postseason/' +
    this.year + '-ncaa.html';
  this.bracket = new Bracket();
}

BracketManager.prototype.populate_data = function(sHtml) {
  var round_names;
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
  var manager = this;

  $ = cheerio.load(sHtml);
  $('#brackets > div').each(function(i, e) { // Regional bracket

    region = $(this).attr('id');
    manager.bracket.data[region] = {};
    if (manager.bracket.is_region(region)) {

      round_names = [
        '1st Round',
        '2nd Round',
        'Sweet 16',
        'Elite 8',
        'Final Four'
      ]; // TODO: Replace with bracket data member

      rounds = $(this).children('#bracket').first().children('.round');
      //////////////////////////////
      // ROUNDS
      //////////////////////////////
      rounds.each(function(ii, ee) {

        round = round_names[ii];
        games = $(this).children('div');

        if (round !== 'Final Four') {

          manager.bracket.data[region][round] = [];

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

            manager.bracket.data[region][round].push(game);
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

        manager.bracket.data[region][round] = {};

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
              manager.bracket.data[region][round][final_4_region] = {};
              manager.bracket.data[region][round][final_4_region]['seed'] = seed;
              manager.bracket.data[region][round][final_4_region]['name'] =
                manager.bracket.abbreviate(team_name);
              if (team_score.length != 0) {
                manager.bracket.data[region][round][final_4_region]['score'] =
                  parseInt(team_score.text());
              }

            } else if (round === 'Championship') {

              team = 'team' + (iiii + 1);
              manager.bracket.data[region][round][team] = {};
              manager.bracket.data[region][round][team]['seed'] = seed;
              manager.bracket.data[region][round][team]['name'] =
                manager.bracket.abbreviate(team_name);
              if (team_score.length != 0) {
                manager.bracket.data[region][round][team]['score'] =
                  parseInt(team_score.text());
              }

            } else if (round === 'Champion') {

              manager.bracket.data[region][round]['team'] = {};
              manager.bracket.data[region][round]['team']['seed'] = seed;
              manager.bracket.data[region][round]['team']['name'] =
                manager.bracket.abbreviate(team_name);
              if (team_score.length != 0) {
                manager.bracket.data[region][round]['team']['score'] =
                  parseInt(team_score.text());
              }

            }
                    
          });

        });

      });

    } else {

      console.log('ERROR matching region: Webpage HTML may have changed.');

    }
  });
};

module.exports = BracketManager;
