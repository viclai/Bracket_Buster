function Bracket() {
  this.rounds = [
    '1st Round',
    '2nd Round',
    'Sweet 16',
    'Elite 8',
    'Final Four'
  ];
  this.regions = [
    'east',
    'midwest',
    'south',
    'west'
  ];
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
  this.data = {};
}

/*
 * Prints the bracket data to console. This is helpful for debugging
 * purposes.
 */
Bracket.prototype.print_data = function() {
  var key;
  var region;
  var round;
  var p1;
  var p2;
  var team;
  var attr;

  for (key in this.data) {
    console.log(key + ':');

    if (key == 'national') {
      region = key;
      for (round in oBracketData[region]) {
        console.log('\t' + round + ':');
        for (p1 in oBracketData[region][round]) {
          for (p2 in oBracketData[region][round][p1]) {
            console.log('\t\t' + p2 + ': ' + 
              this.data[region][round][p1][p2]);
          }
        }
        console.log('\n');
      }
    } else if (key == 'state') {
      console.log(this.data[key]);
    } else { // east, midwest, south, west
      region = key;
      for (round in this.data[region]) {
        console.log('\t' + round + ':');
        this.data[region][round].forEach(function(game) {
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
   * Forces and changes the bracket data to be in a 'Set' state for
   * debugging/testing purposes.
   * @returns {Object} The new, modified bracket data.
   */
  Bracket.prototype.set_bracket_state = function() {
    var new_bracket = {};

    for (key in this.data) {
      new_bracket[key] = this.data[key];
    }
    new_bracket['state'] = {};
    new_bracket['state']['set'] = true;
    return new_bracket;
  };

  /*
   * Forces and changes the bracket data to be in a 'Available' state for
   * debugging/testing purposes.
   * @returns {Object} The new, modified bracket data.
   */
  Bracket.prototype.available_bracket_state = function() {
    var new_bracket = {};
    var key;
    var team;
    var attr;
    var team_obj;
    var game_obj;

    for (key in this.data) {
      new_bracket[key] = {};

      if ('1st Round' in this.data[key]) {
        new_bracket[key]['1st Round'] = []
        this.data[key]['1st Round'].forEach(function(game) {
          game_obj = {};

          for (team in game) {
            game_obj[team] = {};

            for (attr in game[team]) {
              if (attr != 'score') // Exclude scores
                game_obj[team][attr] = game[team][attr];
            }
          }

          new_bracket[key]['1st Round'].push(game_obj);
        });
      } else if (key != 'national')
        new_bracket[key] = this.data[key];
    }
    new_bracket['state'] = {};
    new_bracket['state']['available'] = true;
    return new_bracket;
  };

  /*
   * Forces and changes the bracket data to be in a 'Unavailable' state
   * for debugging/testing purposes.
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
   * Determines if the string is a valid region.
   * @returns {boolean} whether the string value is a region
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
   * Abbreviates a team name.
   * @returns {string} abbreviated name
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
