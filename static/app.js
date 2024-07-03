$(document).ready(function() {
    const socket = io();
    let room, team, tokens, timerInterval;

    // Index page
    $('#create-room-btn').click(function() {
        socket.emit('create_room');
    });

    $('#join-room-btn').click(function() {
        room = $('#room-code').val();
        team = $('#team-name').val();
        if (room && team) {
            socket.emit('join_room', {room: room, team: team});
        }
    });

    socket.on('room_created', function(data) {
        window.location.href = '/qm/' + data.room;
    });

    socket.on('room_joined', function(data) {
        team = data.team;
        tokens = data.tokens;
        window.location.href = '/team/' + room;
    });

    // Quiz Master Room
    if (window.location.pathname.includes('/qm/')) {
        room = $('#room-code').text();

        $('#select-card-btn').click(function() {
            const card = $('#card-select').val();
            if (card) {
                socket.emit('select_card', {room: room, card: card});
            }
        });

        $('#refresh-round-btn').click(function() {
            clearInterval(timerInterval);
            startTimer();
        });

        $('#clear-inputs-btn').click(function() {
            $('#bids-container').empty();
        });

        $('#confirm-winner-btn').click(function() {
            const winner = $('#winner-select').val();
            if (winner) {
                socket.emit('select_winner', {room: room, winner: winner});
            }
        });
    }

    // Team Room
    if (window.location.pathname.includes('/team/')) {
        room = $('#room-code').text();

        $('.bid-btn').click(function() {
            const bid = parseInt($(this).data('value'));
            placeBid(bid);
        });

        $('#custom-bid-btn').click(function() {
            const bid = parseInt($('#custom-bid').val());
            if (!isNaN(bid) && bid > 0) {
                placeBid(bid);
            }
        });
    }

    // Common events
    socket.on('card_selected', function(data) {
        $('#current-card').text('Current Card: ' + data.card);
        startTimer();
    });

    socket.on('bid_placed', function(data) {
        updateBidsDisplay(data);
    });

    socket.on('round_ended', function(data) {
        clearInterval(timerInterval);
        $('#time-left').text('0');
        updateBidsDisplay(data.bids);
        if (window.location.pathname.includes('/qm/')) {
            showWinnerSelection(data.bids);
        }
    });

    socket.on('winner_selected', function(data) {
        $('#round-result').html(`Winner: ${data.winner}<br>Total Bid: ${data.total_bid}`);
        updateTokens(data.teams);
    });

    // Helper functions
    function startTimer() {
        let timeLeft = 60;
        $('#time-left').text(timeLeft);
        clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            timeLeft--;
            $('#time-left').text(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                socket.emit('end_round', {room: room});
            }
        }, 1000);
    }

    function placeBid(bid) {
        if (tokens >= bid) {
            socket.emit('place_bid', {room: room, team: team, bid: bid});
            $('#bid-amount').text(bid);
        } else {
            alert('Insufficient tokens');
        }
    }

    function updateBidsDisplay(bids) {
        const bidsContainer = $('#bids-container');
        bidsContainer.empty();
        for (const [team, bid] of Object.entries(bids)) {
            bidsContainer.append(`<p>${team}: ${bid}</p>`);
        }
    }

    function showWinnerSelection(bids) {
        const winnerSelect = $('#winner-select');
        winnerSelect.empty();
        for (const team of Object.keys(bids)) {
            winnerSelect.append(`<option value="${team}">${team}</option>`);
        }
        $('#winner-selection').show();
    }

    function updateTokens(teams) {
        if (teams[team]) {
            tokens = teams[team];
            $('#tokens').text(tokens);
        }
    }
});