
# KC Hold'Em Quiz Poker

Creating an interactive setup for hosting the quiz poker format that incorporates team selection, card shuffling, point allocation, bidding, and real-time interaction

This is a real-time bidding application for quiz games, featuring a Quiz Master interface and Team Player interfaces.

## Setup

1. Clone this repository
2. Create a virtual environment:
   ```
   python -m venv venv
   ```
3. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On macOS and Linux: `source venv/bin/activate`
4. Install the required packages:
   ```
   pip install -r requirements.txt
   ```
5. Run the application:
   ```
   python app.py
   ```
6. Open a web browser and navigate to `http://localhost:5000`

## How to Play

1. The Quiz Master creates a room and shares the room code with team players.
2. Team players join the room using the code and their team name.
3. The Quiz Master selects cards and starts rounds.
4. Teams place bids within the time limit.
5. The Quiz Master assigns winners and manages the game flow.

Enjoy playing KC Hold'Em Quiz Poker!