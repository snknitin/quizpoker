from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, join_room, leave_room, emit
from threading import Lock
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

rooms = {}  # Example structure: {'ROOMCODE': {'teams': {}, 'current_card': None, 'timer': 60}}
timer_lock = Lock()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/room/<room_code>')
def room(room_code):
    # Simple check to auto-create rooms for this example
    if room_code not in rooms:
        rooms[room_code] = {'teams': {}, 'current_card': None, 'timer': 60}
    return render_template('room.html', room_code=room_code)

def countdown_timer(room_code):
    with timer_lock:
        rooms[room_code]['timer'] = 60
        while rooms[room_code]['timer'] > 0:
            time.sleep(1)
            rooms[room_code]['timer'] -= 1
            socketio.emit('countdown', {'timer': rooms[room_code]['timer']}, room=room_code)

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    rooms[room]['teams'][username] = 300  # Initialize with 300 tokens for simplicity
    emit('join_announcement', {'user': username}, room=room)

@socketio.on('place_bid')
def on_place_bid(data):
    room = data['room']
    bid = data['bid']
    username = data['username']
    # Assume validation and updating of the bid here
    emit('bid_placed', {'user': username, 'bid': bid}, room=room)

@socketio.on('quiz_master_action')
def on_quiz_master_action(data):
    action = data['action']
    room = data['room']
    if action == 'start':
        socketio.start_background_task(countdown_timer, room)
    elif action == 'clear':
        # Implement clearing of bids here
        pass
    elif action == 'assign':
        # Implement point assignment logic here
        pass

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    if username in rooms[room]['teams']:
        del rooms[room]['teams'][username]
    emit('leave_announcement', {'user': username}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True,allow_unsafe_werkzeug=True)
