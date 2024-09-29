from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from eyeware.client import TrackerClient
import time
import os
import string
from openai import OpenAI
from config import BEAM_PORT, BACKEND_PORT
from dotenv import load_dotenv

load_dotenv()

# Initialize Flask app and Socket.IO
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize the OpenAI client with the API key
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Function to run the eye tracker and emit gaze data
def run_tracker():
    tracker = TrackerClient(base_communication_port=BEAM_PORT, hostname="127.0.0.1")

    while True:
        if tracker.connected:
            screen_gaze = tracker.get_screen_gaze_info()
            screen_gaze_is_lost = screen_gaze.is_lost
            if not screen_gaze_is_lost:
                screen_gaze_data = {
                    "x": screen_gaze.x,
                    "y": screen_gaze.y
                }
                socketio.emit('screen_gaze_data', screen_gaze_data)
                print(f"Sent Gaze on Screen: {screen_gaze_data}")
            time.sleep(1/20)  # Emit data at 20Hz
        else:
            print("No connection with tracker server")
            time.sleep(2)

# Synonym replacement logic

# Function to get a simpler word using the OpenAI API
def get_simpler_word(word, context):
    try:
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"Take in the context as to not change prepositions, pronouns, conjunctions, determiners, and auxiliary verbs: '{context}', now please give a simpler synonym for the word: '{word}', but ONLY write the word itself, no explanation."
            }],
            model="gpt-4o-mini",
            temperature=0.4,
            max_tokens=4,
            stream=False
        )
        simpler_word = response.choices[0].message.content.strip()
        print(f"API response for '{word}': {simpler_word}")
        return simpler_word
    except Exception as e:
        print(f"Error querying OpenAI API: {e}")
        return None

# Function to separate the word from its punctuation
def separate_word_punctuation(word):
    """Separates a word from its punctuation, if any."""
    suffix_punct = ""
    while word and word[-1] in string.punctuation:
        suffix_punct = word[-1] + suffix_punct
        word = word[:-1]
    
    prefix_punct = ""
    while word and word[0] in string.punctuation:
        prefix_punct = prefix_punct + word[0]
        word = word[1:]

    return word, prefix_punct, suffix_punct

# Function to replace a word with its simpler synonym if available
def replace_with_easier_synonym(word, context, is_first_word=False):
    original_word = word
    word, prefix_punct, suffix_punct = separate_word_punctuation(word)
    simpler_word = get_simpler_word(word, context)

    if simpler_word and simpler_word.lower() != word:
        if is_first_word or original_word[0].isupper():
            simpler_word = simpler_word.capitalize()
        else:
            simpler_word = simpler_word.lower()

        return prefix_punct + simpler_word + suffix_punct
    return original_word

# Handle WebSocket for word detection
@socketio.on('word_detection')
def handle_word_detection(data):
    word = data['word']
    context = data['context']
    print(f"Received word: {word}, Context: {context}")

    simpler_word = replace_with_easier_synonym(word, context)

    if simpler_word:
        emit('synonym_response', {'originalWord': word, 'simpler_word': simpler_word})
    else:
        emit('synonym_response', {'originalWord': word, 'simpler_word': word})

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
