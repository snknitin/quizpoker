from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, join_room, leave_room, emit
import random
import string
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app)

rooms = {}

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/qm/<room>')
def qm_room(room):
    return render_template('qm_room.html', room=room)

@app.route('/team/<room>')
def team_room(room):
    return render_template('team_room.html', room=room)

@socketio.on('create_room')
def on_create_room():
    room = generate_room_code()
    while room in rooms:
        room = generate_room_code()
    rooms[room] = {
        'teams': {},
        'cards': list(range(52)),  # Placeholder for card deck
        'current_card': None,
        'timer': 75,
        'bids': {},
        'card_worth': 0,
        'created_at': time.time()
    }
    join_room(room)
    emit('room_created', {'room': room})

@socketio.on('join_room')
def on_join_room(data):
    room = data['room']
    team = data['team']
    if room in rooms:
        if team not in rooms[room]['teams']:
            rooms[room]['teams'][team] = 300  # Initial tokens
        join_room(room)
        emit('room_joined', {'team': team, 'tokens': rooms[room]['teams'][team]}, room=room)
    else:
        emit('error', {'message': 'Room not found'})

@socketio.on('select_card')
def on_select_card(data):
    room = data['room']
    card = data['card']
    if room in rooms:
        rooms[room]['current_card'] = card
        rooms[room]['bids'] = {}
        rooms[room]['card_worth'] = 0
        emit('card_selected', {'card': card}, room=room)

@socketio.on('start_timer')
def on_start_timer(data):
    room = data['room']
    custom_time = data.get('custom_time', 75)
    if room in rooms:
        rooms[room]['timer'] = custom_time
        emit('timer_started', {'time': custom_time}, room=room)

@socketio.on('place_bid')
def on_place_bid(data):
    room = data['room']
    team = data['team']
    bid = data['bid']
    timestamp = time.time()
    if room in rooms and team in rooms[room]['teams']:
        if rooms[room]['teams'][team] >= bid:
            rooms[room]['bids'][team] = {'amount': bid, 'time': timestamp}
            emit('bid_placed', {'team': team, 'bid': bid, 'timestamp': timestamp}, room=room)
        else:
            emit('error', {'message': 'Insufficient tokens'}, room=request.sid)

@socketio.on('get_priority')
def on_get_priority(data):
    room = data['room']
    if room in rooms:
        valid_bids = {team: bid for team, bid in rooms[room]['bids'].items() if bid['time'] <= rooms[room]['timer']}
        sorted_bids = sorted(valid_bids.items(), key=lambda x: (-x[1]['amount'], x[1]['time']))
        rooms[room]['card_worth'] = sum(bid['amount'] for bid in valid_bids.values())
        emit('priority_list', {'bids': sorted_bids, 'card_worth': rooms[room]['card_worth']}, room=room)

@socketio.on('assign_winner')
def on_assign_winner(data):
    room = data['room']
    winner = data['winner']
    if room in rooms:
        if winner != 'no_winner':
            rooms[room]['teams'][winner] += rooms[room]['card_worth']
        for team, bid in rooms[room]['bids'].items():
            if bid['time'] <= rooms[room]['timer']:
                rooms[room]['teams'][team] -= bid['amount']
        emit('winner_assigned', {'winner': winner, 'card_worth': rooms[room]['card_worth'], 'teams': rooms[room]['teams']}, room=room)

@socketio.on('clear_round')
def on_clear_round(data):
    room = data['room']
    if room in rooms:
        rooms[room]['bids'] = {}
        rooms[room]['current_card'] = None
        rooms[room]['card_worth'] = 0
        rooms[room]['timer'] = 75
        emit('round_cleared', room=room)



if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)