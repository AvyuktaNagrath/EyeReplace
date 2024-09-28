from flask import Flask
from threading import Thread
from flask_socketio import SocketIO
from tracker import run_tracker
from config import BACKEND_PORT

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Start the eye tracker in a separate thread
tracker_thread = Thread(target=run_tracker)
tracker_thread.start()

@app.route('/')
def index():
    return "Eye Tracker WebSocket Server is running."

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=BACKEND_PORT)
