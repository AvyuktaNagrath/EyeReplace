from flask import Flask, request, jsonify
from tracker import run_tracker
from threading import Thread
from config import BEAM_PORT, BACKEND_PORT

app = Flask(__name__)

# Start the eye tracker in a separate thread
tracker_thread = Thread(target=run_tracker)
tracker_thread.start()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=BACKEND_PORT)
