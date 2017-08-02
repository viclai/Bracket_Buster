$(function(){
  $('.bb-seed-real').hide();
  $('.bb-team-name-real').hide();
  $('.bb-score').hide();

  if ($('#bb-set').length != 0) {
    $('.bb-team-pick').prop('disabled', true);
  }

  // http://jsfiddle.net/softvar/BtLxY/
  $('input[type="radio"]').each(function() {
    $(this).attr('waschecked', false);
  });

  $('input[name="bb-option"]').change(function() {
    var op = $(this).val();

    if (op == 'picks_op') {
      // Show radio button and team-pick with seed
      $('.bb-seed').show();
      $('.bb-team-name').show();
      $('.bb-seed-real').hide();
      $('.bb-team-name-real').hide();
      $('input[name^="round1"').show();
      $('.bb-team-pick:checked').show();
      // TODO: Show team past the first round that was unchecked
      $('.bb-team-pick:checked').each(function() {
        var name = $(this).attr('name');
        var hyphenIn = name.indexOf('-');
        var game = parseInt(name.slice(hyphenIn + 1, hyphenIn + 3));
        var brack = Math.floor(game / 2);
        var isTop = (game % 2) == 0;
        var round = parseInt(name[hyphenIn - 1]) + 1;
        var next;

        if (brack.toString().length == 1)
          brack = '0' + brack;

        next = 'round' + round + '-' + brack;

        if (isTop)
          $('input[name="' + next + '"]:first').show();
        else
          $('input[name="' + next + '"]:last').show();
      });
      $('.bb-score').hide();

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
        if ($(this).siblings('.bb-team-name').first().html() !=
            $(curSelector).siblings('.bb-team-name').first().html())
            break;

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
              $(curSelector).siblings('.bb-team-name').first().html())
            break;

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
});
