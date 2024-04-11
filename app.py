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