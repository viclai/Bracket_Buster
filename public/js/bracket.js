/*
 * Creates a new Bracket.
 * @class
 */
function Bracket() {
  this.preliminary_rounds = {
    '1st Round'  : 0,
    '2nd Round'  : 1,
    'Sweet 16'   : 2,
    'Elite 8'    : 3,
    'Final Four' : 4
  };
  this.final_rounds = {
    'Final Four'   : 4,
    'Championship' : 2,
    'Champion'     : 1
  };
  this.regions = [];
  this.name_abbrs = {
    'florida gulf coast'        : 'FGC',
    'north carolina-wilmington' : 'UNCW'
  };
  this.word_abbrs = {
    'state'     : 'St',
    'saint'     : 'St',
    'north'     : 'N',
    'northern'  : 'N',
    'west'      : 'W',
    'south'     : 'S',
    'tennessee' : 'Tenn',
    'mount'     : 'Mt'
  };
  this.total_teams = 64; // TODO: The First Four are excluded for now.

  this.data = {};
  this.data['state'] = {};
  this.data['regions'] = {};
  this.data['regions']['region1'] = {};
  this.data['regions']['region2'] = {};
  this.data['regions']['region3'] = {};
  this.data['regions']['region4'] = {};
  for (var r in this.data['regions']) {
    for (var i = 0; i < Object.keys(this.preliminary_rounds).length - 1; i++) {
      this.data['regions'][r][Object.keys(this.preliminary_rounds)[i]] = [];
    }
  }
  this.data['regions']['national'] = {};
  for (var r in this.final_rounds) {
    this.data['regions']['national'][r] = {};
  }
}

/*
 * Prints the bracket data to console. This is helpful for debugging
 * purposes.
 */
Bracket.prototype.print_data = function() {
  var key;
  var region;
  var region_key;
  var round;
  var team;
  var attr;
  var i;

  try {
    for (key in this.data['regions']) {
      console.log(key + ':');

      if (key == 'national') {
        region = key;
        for (round in this.data['regions'][region]) {
          console.log('\t' + round + ':');
          for (team in this.data['regions'][region][round]) {
            console.log('\t\t' + team + ':')
            for (attr in this.data['regions'][region][round][team]) {
              console.log('\t\t\t' + attr + ':',
                this.data['regions'][region][round][team][attr]);
            }
          }
          console.log('\n');
        }
      } else { // region1, region2, region3, region4
        region = key;
        for (region_key in this.data['regions'][region]) {
          if (typeof this.data['regions'][region][region_key] == 'string') {
            console.log('\t' + region_key + ':',
              this.data['regions'][region][region_key]);
          } else {
            round = region_key;
            console.log('\t' + round + ':');
            //this.data['regions'][region][round].forEach(function(game) {
            for (i = 0; i < this.data['regions'][region][round].length; i++) {
              game = this.data['regions'][region][round][i];
              console.log('\t\tgame', (i + 1) + ':');
              for (team in game) {
                console.log('\t\t\t' + team + ':');
                for (attr in game[team]) {
                  console.log('\t\t\t\t' + attr + ':', game[team][attr]);
                }
              }
              console.log('\n');
            };
          }
        }
      }
    }
  } catch (e) {
    console.log("Error (print_data):", e.stack);
    console.log("Error (print_data):", e.name);
    console.log("Error (print_data):", e.message);
  }
};

/*
 * Forces and changes the bracket data to be in a 'Set' state for
 * debugging/testing purposes. The data is defined to be in a 'Set'
 * state when at least one March Madness game has begun so user picks
 * are set and can no longer be changed.
 * @returns {Object} The new, modified bracket data.
 */
Bracket.prototype.set_bracket_state = function() {
  var new_bracket = {};
  var key;

  for (key in this.data) {
    new_bracket[key] = this.data[key];
  }
  new_bracket['state'] = {};
  new_bracket['state']['set'] = true;
  return new_bracket;
};

/*
 * Forces and changes the bracket data to be in a 'Available' state for
 * debugging/testing purposes. The data is defined to be in a
 * 'Available' state when teams and matchups are determined but no
 * games have been played yet.
 * @returns {Object} The new, modified bracket data.
 */
Bracket.prototype.available_bracket_state = function() {
  var new_bracket = {};
  var region;
  var round;
  var team;
  var attr;
  var team_obj;
  var n_teams;
  var i;

  new_bracket['regions'] = {};

  for (region in this.data['regions']) {
    new_bracket['regions'][region] = {};

    if (region != 'national') {
      for (round in this.data['regions'][region]) {
        if (round != 'name') {
          n_teams = this.num_teams(round) / 2;

          new_bracket['regions'][region][round] = [];
          for (i = 0; i < n_teams; i++) {
            new_bracket['regions'][region][round].push({
              'team1' : {
                "seed"  : " ",
                "name"  : " ",
                "score" : " "
              },
              'team2' : {
                "seed"  : " ",
                "name"  : " ",
                "score" : " "
              }
            });
          }

          if (round == '1st Round') {
            for (i = 0; i < this.data['regions'][region][round].length; i++) {
              game = this.data['regions'][region][round][i];
              for (team in game) {
                for (attr in game[team]) {
                  if (attr != 'score') {
                    new_bracket['regions'][region][round][i][team][attr] = game[team][attr];
                  }
                }
              }
            }
          }
        }
      }

    }
  }
  new_bracket['state'] = {};
  new_bracket['state']['available'] = true;
  return new_bracket;
};

/*
 * Forces and changes the bracket data to be in a 'Unavailable' state
 * for debugging/testing purposes. The data is defined to be in a
 * 'Unavailable' state when no data is available yet for March Madness
 * for this year.
 * @returns {Object} The new, modified bracket data.
 */
Bracket.prototype.unavailable_bracket_state = function() {
  var new_bracket = {};

  for (key in this.data) {
    new_bracket[key] = this.data[key];
  }
  new_bracket['state'] = {};
  new_bracket['state']['unavailable'] = true;
  return new_bracket;
};

/*
 * Determines the number of teams in a region for a given round of the
 * bracket.
 * @param {string} sRound  - The name of the round
 * @returns {number} The number of teams.
 */
Bracket.prototype.num_teams = function(sRound) {
  if (!(sRound in this.preliminary_rounds) && !(sRound in this.final_rounds))
    return -1;

  if (sRound in this.preliminary_rounds) {
    return this.total_teams / (Math.pow(2, this.preliminary_rounds[sRound]) * this.regions.length);
  } else if (sRound in this.final_rounds) {
    return this.final_rounds[sRound];
  }
  return -1;
}

/*
 * Determines if the string is a valid region.
 * @returns {boolean} Whether the string value is a region
 */
Bracket.prototype.is_region = function(sId) {
  var i;

  for (i = 0; i < this.regions.length; i++) {
    if (sId == this.regions[i])
      return true;
  }
  return false;
};

/*
 * Adds a region.
 * @param {string} The name of the region
 */
Bracket.prototype.add_region = function(sRegion) {
  this.regions.push(sRegion);
}

/*
 * Abbreviates a team name.
 * @returns {string} Abbreviated name
 */
Bracket.prototype.abbreviate = function(sName) {
  var parts = sName.split(" ");
  var i;
  var lower;

  if (sName.toLowerCase() in this.name_abbrs) {
    return this.name_abbrs[sName.toLowerCase()];
  }

  for (i = 0; i < parts.length; i++) {
    lower = parts[i].toLowerCase();
    if (lower in this.word_abbrs) {
      parts[i] = this.word_abbrs[lower];
    }
  }

  sName = '';
  for (i = 0; i < parts.length; i++) {
    sName += parts[i] + ' ';
  }
  sName = sName.slice(0, -1);
  return sName;
};

module.exports = Bracket;
