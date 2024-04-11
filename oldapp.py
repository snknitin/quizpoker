import string
import random

from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
from threading import Lock
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret_key_here'
socketio = SocketIO(app)

rooms = {}  # Example structure: {'room_code': {'teams': {}, 'selected_card': None, 'timer': 60, 'bids': []}}
timer_lock = Lock()

def countdown_timer(room_code):
    with timer_lock:
        rooms[room_code]['timer'] = 60
        while rooms[room_code]['timer'] > 0:
            socketio.sleep(1)
            rooms[room_code]['timer'] -= 1
            socketio.emit('update_timer', {'timer': rooms[room_code]['timer']}, room=room_code)
            # Logic to handle when timer ends
            finalize_bids(room_code)

def finalize_bids(room_code):
    # Example finalization logic, can be expanded based on game rules
    if not rooms[room_code]['bids']:  # Check if there are any bids
        socketio.emit('round_ended', {'message': "No bids were placed."}, room=room_code)
        return

    # Simplified example: select the highest bid as the winner
    winning_bid = max(rooms[room_code]['bids'], key=lambda x: x['bid'])
    winning_team = winning_bid['team']
    points_awarded = sum(bid['bid'] for bid in rooms[room_code]['bids'])  # Sum of all bids as points

    # Update the winning team's tokens (points)
    rooms[room_code]['teams'][winning_team]['tokens'] += points_awarded

    # Notify all clients in the room about the winning team and awarded points
    socketio.emit('winning_team_announcement', {
        'winningTeam': winning_team,
        'pointsAwarded': points_awarded
    }, room=room_code)

    # Reset bids for the next round
    rooms[room_code]['bids'] = []
    # Emit an update to clear bids on client-side
    socketio.emit('update_bids', {'bids': []}, room=room_code)
    # Optionally, reset other round-specific data as needed

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_room', methods=['GET'])
def create_room():
    values = string.ascii_uppercase + string.digits
    output = [random.choice(values) for i in range(4)]
    room_code = "".join(output)
    rooms[room_code] = {'teams': {}, 'selected_card': None, 'timer': 60, 'bids': []}
    return redirect(url_for('qm_room', room_code=room_code))

@app.route('/qm_room/<room_code>')
def qm_room(room_code):
    return render_template('qm_room.html', room_code=room_code)

@app.route('/room/<room_code>')
def team_room(room_code):
    if room_code not in rooms:
        return "Room not found", 404
    return render_template('team_room.html', room_code=room_code)

@socketio.on('join_room')
def on_join_room(data):
    room = data['room']
    team_name = data.get('teamName')
    join_room(room)
    if team_name:
        # Initialize tokens for team if not already present
        rooms[room]['teams'].setdefault(team_name, {'tokens': 300})
        # Send current tokens to team
        emit('update_tokens', {'tokens': rooms[room]['teams'][team_name]['tokens']})

@socketio.on('start_round')
def on_start_round(data):
    room = data['room']
    socketio.start_background_task(countdown_timer, room)

@socketio.on('select_card')
def on_select_card(data):
    room = data['room']
    card = data['card']
    rooms[room]['selected_card'] = card
    emit('show_selected_card', {'card': card}, room=room)

@socketio.on('place_bid')
def on_place_bid(data):
    room = data['room']
    team_name = data['teamName']
    bid_amount = data['bid']
    if team_name in rooms[room]['teams'] and bid_amount <= rooms[room]['teams'][team_name]['tokens']:
        # Subtract bid amount from team's tokens
        rooms[room]['teams'][team_name]['tokens'] -= bid_amount
        # Add bid to the room's bid list (simplified example)
        rooms[room]['bids'].append({'team': team_name, 'bid': bid_amount, 'timeElapsed': 60 - rooms[room]['timer']})
        # Update all clients with the new bid
        emit('update_bids', {'bids': rooms[room]['bids']}, room=room)
        # Update the team with the new token count
        emit('update_tokens', {'tokens': rooms[room]['teams'][team_name]['tokens']}, room=request.sid)

@socketio.on('clear_bids')
def on_clear_bids(data):
    room = data['room']
    rooms[room]['bids'] = []
    emit('update_bids', {'bids': rooms[room]['bids']}, room=room)

# Additional endpoints and event handlers as needed

@socketio.on('assign_points')
def on_assign_points(data):
    room = data['room']
    winning_team = data['winningTeam']
    total_bids = sum(bid['bid'] for bid in rooms[room]['bids'])

    # Assign points (here, simply adding tokens)
    if winning_team in rooms[room]['teams']:
        rooms[room]['teams'][winning_team]['tokens'] += total_bids

    # Optionally, reset bids for the next round
    rooms[room]['bids'] = []

    # Broadcast the updated token count to the winning team
    emit('update_tokens', {'tokens': rooms[room]['teams'][winning_team]['tokens']}, room=room)

    # Notify all clients in the room about the winning team and their reward
    emit('winning_team_announcement', {'winningTeam': winning_team, 'pointsAwarded': total_bids}, room=room)


@socketio.on('end_round')
def on_end_round(data):
    room = data['room']

    # Ensure no further bids can be placed by resetting the bids list or locking it
    rooms[room]['bids'] = []

    # Broadcast to the room that the round has ended
    emit('round_ended', {'message': "The round has ended. No more bids can be placed."}, room=room)

    # Prepare for the next round as needed, e.g., resetting the timer, clearing selected card, etc.
    rooms[room]['timer'] = 60  # Reset timer for the next round
    rooms[room]['selected_card'] = None  # Clear selected card



if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
