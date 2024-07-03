from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, join_room, emit
import random
import string

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app)

rooms = {}

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
def create_room(data):
    room = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    rooms[room] = {'teams': {}, 'current_card': None, 'timer': 60, 'bids': {}}
    join_room(room)
    emit('room_created', {'room': room})

@socketio.on('join_room')
def on_join(data):
    room = data['room']
    team = data['team']
    if room in rooms:
        if team not in rooms[room]['teams']:
            rooms[room]['teams'][team] = 300
        join_room(room)
        emit('room_joined', {'team': team, 'tokens': rooms[room]['teams'][team]}, room=room)
    else:
        emit('error', {'message': 'Room not found'})

@socketio.on('select_card')
def select_card(data):
    room = data['room']
    card = data['card']
    rooms[room]['current_card'] = card
    rooms[room]['bids'] = {}
    emit('card_selected', {'card': card}, room=room)

@socketio.on('place_bid')
def place_bid(data):
    room = data['room']
    team = data['team']
    bid = data['bid']
    if room in rooms and team in rooms[room]['teams']:
        if rooms[room]['teams'][team] >= bid:
            rooms[room]['bids'][team] = bid
            emit('bid_placed', {'team': team, 'bid': bid}, room=room)
        else:
            emit('error', {'message': 'Insufficient tokens'}, room=room)

@socketio.on('end_round')
def end_round(data):
    room = data['room']
    if room in rooms:
        sorted_bids = sorted(rooms[room]['bids'].items(), key=lambda x: x[1], reverse=True)
        emit('round_ended', {'bids': dict(sorted_bids)}, room=room)

@socketio.on('select_winner')
def select_winner(data):
    room = data['room']
    winner = data['winner']
    if room in rooms and winner in rooms[room]['teams']:
        total_bid = sum(rooms[room]['bids'].values())
        rooms[room]['teams'][winner] += total_bid
        for team, bid in rooms[room]['bids'].items():
            if team != winner:
                rooms[room]['teams'][team] -= bid
        emit('winner_selected', {'winner': winner, 'total_bid': total_bid, 'teams': rooms[room]['teams']}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)