/* add-on script */

function save_bracket(event, closeDialog) {
  var data;
  console.log(closeDialog);

  if (event.action == 'bb.dialog.action') {
    // Get data from radio input
    data = JSON.parse($('#bb-empty-bracket').val());
    $('.bb-team-pick:checked').each(function() {
      var name = $(this).attr('name');
      var hyphenIn = name.indexOf('-');
      var game = parseInt(name.slice(hyphenIn + 1, hyphenIn + 3));
      var brack = Math.floor(game / 2);
      var isTop = (game % 2) == 0;
      var round = parseInt(name[hyphenIn - 1]);
      var team = $(this).siblings('.bb-team-name').first().html();
      var seed = $(this).siblings('.bb-seed').first().html();
      var next_round = round + 1;
      var region_name;
      var rounds = {
        1 : '1st Round',
        2 : '2nd Round',
        3 : 'Sweet 16',
        4 : 'Elite 8',
        5 : 'Final Four',
        6 : 'Championship',
        7 : 'Champion'
      };

      if (round == 1)
        region_name = parseInt(Math.floor(game / 8)) + 1;
      else if (round == 2)
        region_name = parseInt(Math.floor(game / 4)) + 1;
      else if (round == 3)
        region_name = parseInt(Math.floor(game / 2)) + 1;
      else if (round == 4)
        region_name = game + 1;
      else
        region_name = 'national';

      if (region_name == 2)
        region_name = 'region' + 3;
      else if (region_name == 3)
        region_name = 'region' + 2;
      else if (region_name != 'national')
        region_name = 'region' + region_name;

      if (region_name != 'national') {
        if (isTop) {
          data[region_name][rounds[next_round]][brack]['team1']['seed'] = seed;
          data[region_name][rounds[next_round]][brack]['team1']['name'] = team;
        } else {
          data[region_name][rounds[next_round]][brack]['team2']['seed'] = seed;
          data[region_name][rounds[next_round]][brack]['team2']['name'] = team;
        }
      } else {
        data[region_name][rounds[next_round]]['team' + (brack + 1)]['seed'] = seed;
        data[region_name][rounds[next_round]]['team' + (brack + 1)]['name'] = team;
      }
    });

    // TODO: Save bracket picks
    HipChat.auth.withToken(function(err, token) {
      if (err) {
        console.log('ERROR retrieving JWT');
        // TODO: Alert that bracket did not save
      } else {
        $.ajax({
          type: 'POST',
          url: '/bracket_pick',
          headers: { 'Authorization': 'JWT ' + token },
          data: {'data' : JSON.stringify(data)},
          success: function(result, status, xhr) {
            // TODO
            console.log('BB bracket picks saved successfully.');
            console.log('Status:', status);
            closeDialog(true);
          },
          error: function(xhr, status, error) {
            // TODO: Alert that bracket did not save
            console.log('ERROR bracket picks did not save');
            console.log('Error status:', error);
            console.log('Type of error:', status);
          }
        });
      }
    });
  } else {
    closeDialog(true);
  }
}

$(function () {

  // Check the theme...
  var theme = getQueryVariable('theme');
  if (theme === 'light' || theme === 'dark') {
    $('body').addClass(theme);
  }

  ///////////////////////////////////////////////////////////////////
  // Utility functions
  ///////////////////////////////////////////////////////////////////

  function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      if (pair[0] == variable) {
        return pair[1];
      }
    }
    return false;
  }

  // The following functions use the HipChat Javascript API
  // https://developer.atlassian.com/hipchat/guide/javascript-api

  // To send a message to the HipChat room, you need to send a request to the
  // add-on back-end
  function sayHello(callback) {
    //Ask HipChat for a JWT token
    HipChat.auth.withToken(function (err, token) {
      if (!err) {
        // Then, make an AJAX call to the add-on backend, including the JWT token
        // Server-side, the JWT token is validated using the middleware function addon.authenticate()
        $.ajax(
            {
              type: 'POST',
              url: '/send_notification',
              headers: {'Authorization': 'JWT ' + token},
              dataType: 'json',
              data: {messageTitle: 'Hello World!'},
              success: function () {
                callback(false);
              },
              error: function () {
                callback(true);
              }
            });
      }
    });
  }

  ///////////////////////////////////////////////////////////////////
  // Functions used by sidebar.hbs
  ///////////////////////////////////////////////////////////////////

  $('#say_hello').on('click', function () {
    sayHello(function (error) {
      if (error)
        console.log('Could not send message');
    });
  });

  $('#show-room-details').on('click', function (e) {
    HipChat.room.getRoomDetails(function (err, data) {
      if (!err) {
        $('#more-room-details-title').html('More details');
        $('#more-room-details-body').html(JSON.stringify(data, null, 2));
      }
    });
    e.preventDefault();
  });

  $('#show-room-participants').on('click', function (e) {
    HipChat.room.getParticipants(function (err, data) {
      if (!err) {
        $('#room-participants-title').html('Room participants');
        $('#room-participants-details').html(JSON.stringify(data, null, 2));
      }
    });
    e.preventDefault();
  });

  $('#show-user-details').on('click', function (e) {

    HipChat.user.getCurrentUser(function (err, data) {
      if (!err) {
        $('#more-user-details-title').html('User details');
        $('#more-user-details-body').html(JSON.stringify(data, null, 2));
      }
    });
    e.preventDefault();
  });


  ///////////////////////////////////////////////////////////////////
  // Functions used by dialog.hbs
  ///////////////////////////////////////////////////////////////////

  $('.bb-seed-real').hide();
  $('.bb-team-name-real').hide();
  $('.bb-score').hide();

  if ($('#bb-set').length != 0) {
    $('.bb-team-pick').prop('disabled', true);
  }

  /*
   * Determines the name of the next bracket slot.
   * @param {string} sCurSlot - The name of the current slot.
   * @returns {string} - The name of the next slot.
   */
  function next_slot(sCurSlot) {
    var hyphenIn = sCurSlot.indexOf('-');
    var game = parseInt(sCurSlot.slice(hyphenIn + 1, hyphenIn + 3));
    var brack = Math.floor(game / 2);
    var round = parseInt(sCurSlot[hyphenIn - 1]) + 1;
    var next;

    if (brack.toString().length == 1)
      brack = '0' + brack;

    next = 'round' + round + '-' + brack;
    return next;
  }

  /*
   * For teams that advanced, show them in the next round.
   */
  function show_next_slots() {
    $('.bb-team-pick:checked').each(function() {
      var name = $(this).attr('name');
      var next = next_slot(name);
      var hyphenIn = name.indexOf('-');
      var game = parseInt(name.slice(hyphenIn + 1, hyphenIn + 3));
      var isTop = (game % 2) == 0;
      var selected = 'input[name="' + next + '"]';

      if (isTop)
        selected += ':first';
      else
        selected += ':last';
      $(selected).show();

      $(selected).siblings('.bb-team-name:first').html(
        $(this).siblings('.bb-team-name:first').html()
      );
      $(selected).siblings('.bb-seed:first').html(
        $(this).siblings('.bb-seed:first').html()
      );
      $(selected).val($(this).val());
    });
  }

  // TODO: Show checked inputs
  $('.bb-team-name').each(function() {
    var pick = $(this).siblings('.bb-team-pick:first');
    var name;
    var next;
    var hyphenIn;
    var game;
    var isTop;

    if (/^round1/.test(pick.attr('name')) == false) {
      if (pick.val() != String.fromCharCode(160)) {
        $(this).siblings('.bb-team-pick:first').show();
        // Make radio checked   
        $(this).siblings('.bb-team-pick:first').prop('checked', true);
        $(this).siblings('.bb-team-pick:first').attr('waschecked', true);
      }
    } else {
      // TODO: Check team in first round that advanced
      name = pick.attr('name');
      next = next_slot(name);
      hyphenIn = name.indexOf('-');
      game = parseInt(name.slice(hyphenIn + 1, hyphenIn + 3));
      isTop = (game % 2) == 0;

      if (isTop)
        next = 'input[name="' + next + '"]:first';
      else
        next = 'input[name="' + next + '"]:last';

      if ($(next).val() == pick.val()) {
        $(this).siblings('.bb-team-pick:first').prop('checked', true);
        $(this).siblings('.bb-team-pick:first').attr('waschecked', true);
      }
    }
  });

  // Show next slot for checked ones
  show_next_slots();

  // http://jsfiddle.net/softvar/BtLxY/
  $('input[type="radio"]').each(function() {
    $(this).attr('waschecked', false);
  });

  // Toggle between user picks and final results
  $('input[name="bb-option"]').change(function() {
    var op = $(this).val();

    if (op == 'picks_op') {
      
      $('.bb-seed-real').hide();
      $('.bb-team-name-real').hide();
      $('.bb-score').hide();

      // Show radio button and team-pick with seed
      $('.bb-seed').show();
      $('.bb-team-name').show(); 
      $('input[name^="round1"').show();
      $('.bb-team-pick:checked').show();
      // Show team past the first round that was unchecked
      show_next_slots();

    } else if (op == 'scores_op') {
      // Show score and real team with seed
      $('.bb-seed').hide();
      $('.bb-team-name').hide();
      $('.bb-seed-real').show();
      $('.bb-team-name-real').show();
      $('.bb-team-pick').hide();
      $('.bb-score').show();
    }
  });

  // Change a pick
  $('input[type="radio"].bb-team-pick').click(function() {
    var name = $(this).attr('name');
    var hyphenIn = name.indexOf('-');
    var game = parseInt(name.slice(hyphenIn + 1, hyphenIn + 3));
    var brack = Math.floor(game / 2);
    var isTop = (game % 2) == 0;
    var round = parseInt(name[hyphenIn - 1]) + 1;
    var brackName;
    var selector;
    var other = $('[name=\'' + name + '\']').not(this).first();
    var seed;
    var next_round_is_filled = (round - 1) != 1
                                && $(other).is(':visible');
    var curBrack;
    var curBrackName;
    var curSelector;
    var curSeed;
    var curGame;
    var i;

    if (brack.toString().length == 1)
      brack = '0' + brack;
    brackName = 'round' + round + '-' + brack;
    selector = '[name=\'' + brackName + '\']';

    if ($(this).attr('waschecked') == "true") {
      $(this).prop('checked', false);
      $(this).attr('waschecked', false);

      // Erase team in this bracket
      curBrack = brack;
      curGame = game;
      for (i = round; i <= 6; i++) {
        if (curBrack.toString().length == 1)
          curBrack = '0' + curBrack;
        curBrackName = 'round' + i + '-' + curBrack;
        curSelector = '[name=\'' + curBrackName + '\']';

        if (curGame % 2 == 0)
          curSelector += ":first";
        else
          curSelector += ":last";
        if ($(this).val() != $(curSelector).val()) {
            // TODO: 1st round teams have a left-arrow character in their
            //       HTML so just compare input values for now.
            break;
        }

        curSeed = $(curSelector).siblings('.bb-seed').first();
        curSeed.html('');
        $(curSelector).val();
        $(curSelector).siblings('.bb-team-name').first().html('&nbsp;');
        $(curSelector).hide();
        $(curSelector).attr('waschecked', false);
        $(curSelector).prop('checked', false);

        curGame = parseInt(curBrack);
        curBrack = Math.floor(curGame / 2);
      }  

    } else {
      $(this).attr('waschecked', true);

      // Advance team to next bracket
      if (isTop)
        selector += ':first';
      else
        selector += ':last';
      seed = $(selector).siblings('.bb-seed').first();
      seed.html($(this).siblings('.bb-seed').first().html());
      $(selector).val($(this).val());
      $(selector).siblings('.bb-team-name').first().html($(this).val());
      $(selector).show();

      if (next_round_is_filled) {
        $(selector).prop('checked', false);
        $(selector).attr('waschecked', false);

        round++;
        curGame = parseInt(brack);
        curBrack = Math.floor(parseInt(brack) / 2);
        for (i = round; i <= 6; i++) {
          if (curBrack.toString().length == 1)
            curBrack = '0' + curBrack;
          curBrackName = 'round' + i + '-' + curBrack;
          curSelector = '[name=\'' + curBrackName + '\']';

          if (curGame % 2 == 0)
            curSelector += ":first";
          else
            curSelector += ":last";
          if ($(other).siblings('.bb-team-name').first().html() !=
              $(curSelector).siblings('.bb-team-name').first().html()) {
            // TODO: 1st round teams have a left-arrow character in their
            //       HTML so just compare input values for now.
            break;
          }

          curSeed = $(curSelector).siblings('.bb-seed').first();
          curSeed.html('');
          $(curSelector).siblings('.bb-team-name').first().html('&nbsp;');
          $(curSelector).val('');
          $(curSelector).hide();
          $(curSelector).attr('waschecked', false);
          $(curSelector).prop('checked', false);

          curGame = parseInt(curBrack);
          curBrack = Math.floor(curGame / 2);
        }
      }

    }

    $('input[name=\'' + name + '\']').not(this).attr('waschecked', false);
  });

  // Register a listener for the dialog button - primary action
  HipChat.register({
    "dialog-button-click": save_bracket
  });

});
