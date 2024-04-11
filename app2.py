from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, join_room, emit
from threading import Lock
import string
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'very_secret_key'
socketio = SocketIO(app)

# Data structure to store room information
rooms = {}  # e.g., {'room_code': {'locked': False, 'teams': {'Team A': 300}, 'selected_card': '', 'bids': []}}
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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/qm_room/<room_code>')
def qm_room(room_code):
    return render_template('qm_room.html', room_code=room_code)

@app.route('/team_room/<room_code>')
def team_room(room_code):
    if room_code not in rooms:
        return "Room does not exist.", 404
    return render_template('team_room.html', room_code=room_code)

@app.route('/create_room', methods=['GET'])
def create_room():
    values = string.ascii_uppercase + string.digits
    output = [random.choice(values) for i in range(4)]
    room_code = "".join(output)
    rooms[room_code] = {'locked': False, 'teams': {}, 'selected_card': '', 'bids': []}
    return redirect(url_for('qm_room', room_code=room_code))

@socketio.on('join_room')
def on_join(data):
    room_code = data['room']
    team_name = data.get('teamName', None)
    if room_code in rooms and not rooms[room_code]['locked']:
        join_room(room_code)
        if team_name:
            # Add or update team's tokens
            rooms[room_code]['teams'][team_name] = rooms[room_code]['teams'].get(team_name, 300)
        emit('room_joined', {'teams': rooms[room_code]['teams'], 'selected_card': rooms[room_code]['selected_card']}, room=room_code)
    else:
        emit('error', {'message': 'Unable to join room. It may be locked or does not exist.'})

@socketio.on('start_round')
def on_start_round(data):
    room_code = data['room']
    rooms[room_code]['bids'] = []  # Clear previous round's bids
    # Logic to start and manage the round's timer here

@socketio.on('place_bid')
def on_place_bid(data):
    room_code = data['room']
    team_name = data['teamName']
    bid_amount = data['bid']
    # Subtract bid from team's tokens, record the bid, and validate it's within the round's active time

@socketio.on('lock_room')
def on_lock_room(data):
    room_code = data['room']
    rooms[room_code]['locked'] = True  # Prevent new teams from joining

@socketio.on('select_card')
def on_select_card(data):
    room_code = data['room']
    card = data['card']
    rooms[room_code]['selected_card'] = card
    emit('update_selected_card', {'card': card}, room=room_code)

@socketio.on('finalize_bids')
def on_finalize_bids(data):
    room_code = data['room']
    # Logic to process bids, determine winner, etc.

@socketio.on('clear_bids')
def on_clear_bids(data):
    room_code = data['room']
    rooms[room_code]['bids'] = []
    emit('bids_cleared', room=room_code)

@socketio.on('assign_winner')
def on_assign_winner(data):
    room_code = data['room']
    winning_team = data['winner']
    # Logic to add up all bids and assign to winning team's tokens

if __name__ == '__main__':
    socketio.run(app,  allow_unsafe_werkzeug=True)
