const socket = io();
let room, team, isQM;

function updateTeamsList(teams) {
    const teamsList = document.getElementById('teams-list');
    teamsList.innerHTML = '';
    for (const [teamName, tokens] of Object.entries(teams)) {
        teamsList.innerHTML += `<div>${teamName}: ${tokens} tokens</div>`;
    }
}

function updateBidsList(bid) {
    const bidsList = document.getElementById('bids-list');
    bidsList.innerHTML += `<div>${bid.team} bids ${bid.bid} points</div>`;
}

// Index page logic
if (window.location.pathname === '/') {
    const createRoomBtn = document.getElementById('create-room');
    const joinRoomBtn = document.getElementById('join-room');

    createRoomBtn.addEventListener('click', () => {
        socket.emit('create_room');
    });

    joinRoomBtn.addEventListener('click', () => {
        const roomId = document.getElementById('room-id').value;
        const teamName = document.getElementById('team-name').value;
        if (roomId && teamName) {
            socket.emit('join_room', { room: roomId, team: teamName });
        } else {
            alert('Please enter both Room ID and Team Name');
        }
    });

    socket.on('room_created', (data) => {
        window.location.href = `/qm/${data.room}`;
    });

    socket.on('room_joined', (data) => {
        localStorage.setItem('team', data.team);
        window.location.href = `/team/${data.room}`;
    });
}

// QM Room logic
if (window.location.pathname.startsWith('/qm/')) {
    isQM = true;
    room = document.getElementById('room-code').textContent;

    const cardDropdown = document.getElementById('card-dropdown');
    const startTimerBtn = document.getElementById('start-timer');
    const getPriorityBtn = document.getElementById('get-priority');
    const assignWinnerBtn = document.getElementById('assign-winner');
    const clearRoundBtn = document.getElementById('clear-round');
    const winnerSelection = document.getElementById('winner-selection');
    const winnerOptions = document.getElementById('winner-options');
    const confirmWinnerBtn = document.getElementById('confirm-winner');

    // Populate card dropdown
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
    suits.forEach(suit => {
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = `${value} of ${suit}`;
            option.textContent = `${value} of ${suit}`;
            cardDropdown.appendChild(option);
        });
    });

    cardDropdown.addEventListener('change', () => {
        const selectedCard = cardDropdown.value;
        if (selectedCard) {
            socket.emit('select_card', { room, card: selectedCard });
        }
    });

    startTimerBtn.addEventListener('click', () => {
        const customTime = parseInt(document.getElementById('custom-time').value) || 75;
        socket.emit('start_timer', { room, custom_time: customTime });
    });

    getPriorityBtn.addEventListener('click', () => {
        socket.emit('get_priority', { room });
    });

    assignWinnerBtn.addEventListener('click', () => {
        winnerSelection.style.display = 'block';
        winnerOptions.innerHTML = '';
        const teams = Array.from(document.querySelectorAll('#teams-list div')).map(div => div.textContent.split(':')[0].trim());
        teams.forEach(team => {
            winnerOptions.innerHTML += `
                <label>
                    <input type="radio" name="winner" value="${team}">
                    ${team}
                </label><br>
            `;
        });
        winnerOptions.innerHTML += `
            <label>
                <input type="radio" name="winner" value="no_winner">
                No Winner
            </label>
        `;
    });

    confirmWinnerBtn.addEventListener('click', () => {
        const selectedWinner = document.querySelector('input[name="winner"]:checked');
        if (selectedWinner) {
            socket.emit('assign_winner', { room, winner: selectedWinner.value });
            winnerSelection.style.display = 'none';
        } else {
            alert('Please select a winner');
        }
    });

    clearRoundBtn.addEventListener('click', () => {
        socket.emit('clear_round', { room });
    });
}

// Team Room logic
if (window.location.pathname.startsWith('/team/')) {
    isQM = false;
    room = document.getElementById('room-code').textContent;
    team = localStorage.getItem('team');
    document.getElementById('team-name').textContent = team;

    socket.emit('join_room', { room: room, team: team });

    const bidButtons = document.querySelectorAll('.bid-amount');
    const customBidInput = document.getElementById('custom-bid');
    const placeBidBtn = document.getElementById('place-bid');

    let selectedBid = 0;

    bidButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedBid = parseInt(button.dataset.amount);
            customBidInput.value = selectedBid;
        });
    });

    customBidInput.addEventListener('input', () => {
        selectedBid = parseInt(customBidInput.value) || 0;
    });

    placeBidBtn.addEventListener('click', () => {
        if (selectedBid > 0) {
            socket.emit('place_bid', { room, team, bid: selectedBid });
        } else {
            alert('Please select a valid bid amount');
        }
    });
}

// Common logic for both QM and Team rooms
socket.on('card_selected', (data) => {
    const selectedCardDiv = document.getElementById('selected-card');
    selectedCardDiv.textContent = `Selected Card: ${data.card}`;
});

socket.on('timer_update', (data) => {
    const timerDisplay = document.getElementById('time-left');
    timerDisplay.textContent = data.time;
});

socket.on('timer_complete', () => {
    if (isQM) {
        socket.emit('get_priority', { room });
    }
});

socket.on('bid_placed', (data) => {
    updateBidsList(data);
});

socket.on('priority_list', (data) => {
    const priorityTable = document.getElementById('priority-table');
    priorityTable.innerHTML = '<table><tr><th>Team</th><th>Bid</th><th>Priority</th></tr>';
    data.bids.forEach((bid, index) => {
        priorityTable.innerHTML += `<tr>
            <td>${bid[0]}</td>
            <td>${bid[1]}</td>
            <td>${index + 1}</td>
        </tr>`;
    });
    priorityTable.innerHTML += '</table>';

    const cardWorthDiv = document.getElementById('card-worth');
    cardWorthDiv.textContent = `Card is worth ${data.card_worth} points`;
});

socket.on('winner_assigned', (data) => {
    alert(`Winner: ${data.winner}\nCard Worth: ${data.card_worth}`);
    updateTeamsList(data.teams);
});

socket.on('round_cleared', () => {
    document.getElementById('selected-card').textContent = '';
    document.getElementById('card-worth').textContent = '';
    document.getElementById('bids-list').innerHTML = '';
    document.getElementById('priority-table').innerHTML = '';
    document.getElementById('time-left').textContent = '75';
});

socket.on('room_joined', (data) => {
    updateTeamsList(data.teams);
});

socket.on('error', (data) => {
    alert(data.message);
});