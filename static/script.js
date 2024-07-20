const socket = io();
let room, team, isQM;


// Add this function at the beginning of the file
function emitGetTeams() {
    if (room) {
        socket.emit('get_teams', { room: room });
    }
}

// Modify the updateTeamsList function
function updateTeamsList(teams) {
    const teamsList = document.getElementById('teams-list');
    if (teamsList) {
        teamsList.innerHTML = '';
        for (const [teamName, tokens] of Object.entries(teams)) {
            teamsList.innerHTML += `<div>${teamName}: ${tokens} tokens</div>`;
        }
    }

    // Update winner selection options
    const winnerOptions = document.getElementById('winner-options');
    if (winnerOptions) {
        winnerOptions.innerHTML = '';
        Object.keys(teams).forEach(team => {
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
    }
}

function updateBidsList(bid) {
    const bidsList = document.getElementById('bids-list');
    if (bidsList) {
        const bidElement = document.createElement('div');
        bidElement.textContent = `${bid.team} bids ${bid.bid} points (${bid.time.toFixed(2)}s)`;
        bidsList.appendChild(bidElement);
    }
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
        localStorage.setItem('room', data.room);
        window.location.href = `/team/${data.room}`;
    });
}

// QM Room logic
if (window.location.pathname.startsWith('/qm/')) {
    isQM = true;
    console.log('QM Room script section entered');
    room = document.getElementById('room-code').textContent;
    console.log('Room code:', room);

    const cardDropdown = document.getElementById('card-dropdown');
    const startTimerBtn = document.getElementById('start-timer');
    const getPriorityBtn = document.getElementById('get-priority');
    const assignWinnerBtn = document.getElementById('assign-winner');
    const clearRoundBtn = document.getElementById('clear-round');
    const winnerSelection = document.getElementById('winner-selection');
    const winnerOptions = document.getElementById('winner-options');
    const confirmWinnerBtn = document.getElementById('confirm-winner');
    // Log the state of the priority table
    const priorityTable = document.getElementById('priority-table');

    // Immediately request teams list when QM room loads
    socket.emit('get_teams', { room });
//    setInterval(emitGetTeams, 5000);  // Update every 5 seconds

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

    // Immediately request initial data when QM room loads
    socket.emit('get_initial_data', { room });

    // Update the timer display when timer is started
    socket.on('timer_started', (data) => {
        const timerDisplay = document.getElementById('time-left');
        if (timerDisplay) {
            timerDisplay.textContent = data.time;
        }
    });

    socket.on('bid_placed', (data) => {
        updateBidsList(data);
    });

    if (getPriorityBtn) {
        console.log('Get Priority button found');
        getPriorityBtn.addEventListener('click', () => {
            console.log('Get Priority button clicked, emitting get_priority event');
            socket.emit('get_priority', { room: room });
        });
    } else {
        console.error('Get Priority button not found');
    }

    if (priorityTable) {
        console.log('Priority table initial state:', priorityTable.innerHTML);
    } else {
        console.error('Priority table not found in initial state');
    }

//    if (priorityTable) {
//        priorityTable.style.display = 'block';
//        priorityTable.style.visibility = 'visible';
//        priorityTable.style.opacity = '1';
//        priorityTable.style.border = '1px solid black';
//        priorityTable.style.padding = '10px';
//        priorityTable.style.margin = '10px 0';
//        priorityTable.textContent = 'Priority table will appear here.';
//    }

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

    if (team && room) {
        document.getElementById('team-name').textContent = team;
        socket.emit('join_room', { room: room, team: team });
    } else {
        alert('Error: Team or room information is missing');
        window.location.href = '/';
    }

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
    if (selectedCardDiv) {
        selectedCardDiv.textContent = `Selected Card: ${data.card}`;
    }
});

socket.on('timer_update', (data) => {
    const timerDisplay = document.getElementById('time-left');
    if (timerDisplay) {
        timerDisplay.textContent = data.time;
    }
});

socket.on('timer_complete', () => {
    if (isQM) {
        socket.emit('get_priority', { room });
    }
});

socket.on('bid_placed', (data) => {
    updateBidsList(data);
});

// Update the priority_list event listener
socket.on('priority_list', (data) => {
    console.log('Received priority_list event:', data);

    const priorityTable = document.getElementById('priority-table');
    if (priorityTable) {
        try {
            console.log('Priority table div found');

            // Clear existing content
            priorityTable.innerHTML = '';
            console.log('Cleared existing content');

            // Create table element
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            console.log('Created table element');

            // Create header
            const header = table.createTHead();
            const headerRow = header.insertRow();
            ['Team', 'Bid', 'Time', 'Priority'].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.border = '1px solid black';
                th.style.padding = '5px';
                headerRow.appendChild(th);
            });
            console.log('Created table header');

            // Create body
            const body = table.createTBody();
            data.bids.forEach((bid, index) => {
                const row = body.insertRow();
                [bid.team, bid.amount, `${bid.time.toFixed(2)}s`, index + 1].forEach(text => {
                    const cell = row.insertCell();
                    cell.textContent = text;
                    cell.style.border = '1px solid black';
                    cell.style.padding = '5px';
                });
            });
            console.log('Created table body');

            // Append table to priority-table div
            priorityTable.appendChild(table);
            console.log('Appended table to priority-table div');

            console.log('Priority table updated successfully');
        } catch (error) {
            console.error('Error updating priority table:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Data received:', JSON.stringify(data));
        }
    } else {
        console.error('Priority table element not found');
    }

    const cardWorthDiv = document.getElementById('card-worth');
    if (cardWorthDiv) {
        cardWorthDiv.textContent = `Card is worth ${data.card_worth} points`;
        console.log('Card worth updated');
    } else {
        console.error('Card worth element not found');
    }
});

socket.on('winner_assigned', (data) => {
    alert(`Winner: ${data.winner}\nCard Worth: ${data.card_worth}`);
    updateTeamsList(data.teams);
});

socket.on('round_cleared', () => {
    const elements = ['selected-card', 'card-worth', 'bids-list', 'priority-table', 'time-left'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'time-left') {
                element.textContent = '75';
            } else {
                element.innerHTML = '';
            }
        }
    });
});

// Modify the existing 'room_joined' event listener
socket.on('room_joined', (data) => {
    updateTeamsList(data.teams);
    if (isQM) {
        socket.emit('get_initial_data', { room });
    }
});


// Add a new event listener for initial data
socket.on('initial_data', (data) => {
    updateTeamsList(data.teams);
    updateBidsList(data.bids);
    const timerDisplay = document.getElementById('time-left');
    if (timerDisplay) {
        timerDisplay.textContent = data.timer;
    }
});


socket.on('error', (data) => {
    alert(data.message);
    window.location.href = '/';
});

// Add a new event listener for updating teams
socket.on('teams_updated', (data) => {
    updateTeamsList(data.teams);
});


// Add this at the end of the file
socket.on('connect', () => {
    console.log('Socket connected');
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});