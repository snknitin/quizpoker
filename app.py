from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, join_room, leave_room, emit
from random import randint

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Placeholder for room storage
rooms = {}  # Example: {'ROOMCODE': {'teams': {}, 'current_card': None}}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_room', methods=['POST'])
def create_room():
    room_code = str(randint(1000, 9999))
    rooms[room_code] = {'teams': {}, 'current_card': None}
    return redirect(url_for('room', room_code=room_code))

@app.route('/room/<room_code>')
def room(room_code):
    if room_code not in rooms:
        return "Room not found", 404
    return render_template('room.html', room_code=room_code)

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    rooms[room]['teams'][username] = 300  # Every team starts with 300 tokens
    emit('join_announcement', {'user': username}, room=room)

@socketio.on('place_bid')
def on_place_bid(data):
    room = data['room']
    bid = data['bid']
    username = data['username']
    # Simple validation and bid placement
    if username in rooms[room]['teams'] and isinstance(bid, int) and 0 < bid <= rooms[room]['teams'][username]:
        rooms[room]['teams'][username] -= bid  # Deduct bid amount from team's tokens
        emit('bid_placed', {'user': username, 'bid': bid}, room=room)
    else:
        emit('error', {'message': 'Invalid bid'}, room=room)

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    if username in rooms[room]['teams']:
        del rooms[room]['teams'][username]
    emit('leave_announcement', {'user': username}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True)
