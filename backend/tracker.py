from eyeware.client import TrackerClient
from flask import Flask
from flask_socketio import SocketIO
import time

# Ports configuration
BEAM_PORT = 12010
BACKEND_PORT = 5000

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

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
                socketio.emit('screen_gaze_data', screen_gaze_data)
                print(f"Sent Gaze on Screen: {screen_gaze_data}")

            time.sleep(1)  # Data frequency at 30 Hz
        else:
            print("No connection with tracker server")
            time.sleep(2)

@app.route('/')
def index():
    return "Eye Tracker WebSocket Server is running."

if __name__ == '__main__':
    socketio.start_background_task(target=run_tracker)
    socketio.run(app, host='0.0.0.0', port=BACKEND_PORT)
