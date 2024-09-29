from flask import Flask
from flask_socketio import SocketIO
from eyeware.client import TrackerClient
import time
from config import BEAM_PORT, BACKEND_PORT

# Initialize Flask app and Socket.IO
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Function to run the eye tracker and emit gaze data
def run_tracker():
    tracker = TrackerClient(base_communication_port=BEAM_PORT, hostname="127.0.0.1")

    while True:
        if tracker.connected:
            # Retrieve and send screen gaze data
            screen_gaze = tracker.get_screen_gaze_info()
            screen_gaze_is_lost = screen_gaze.is_lost
            if not screen_gaze_is_lost:
                screen_gaze_data = {
                    "x": screen_gaze.x,
                    "y": screen_gaze.y
                }
                # Emit gaze data to connected clients
                socketio.emit('screen_gaze_data', screen_gaze_data)
                print(f"Sent Gaze on Screen: {screen_gaze_data}")
            time.sleep(1/20)  # Adjust the data frequency if needed
        else:
            print("No connection with tracker server")
            time.sleep(2)

# Start the eye tracker in the background when the app starts
@socketio.on('connect')
def on_connect():
    print('Client connected')

# Route to check if the server is running
@app.route('/')
def index():
    return "Eye Tracker WebSocket Server is running."

# Main entry point to run the Flask-SocketIO server
if __name__ == "__main__":
    socketio.start_background_task(run_tracker)  # Start the eye tracker in the background
    socketio.run(app, host="0.0.0.0", port=BACKEND_PORT)
