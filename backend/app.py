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

# === Synonym replacement logic ===

# Function to get a simpler synonym using OpenAI API
def get_simpler_word(word, context):
    try:
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"Take in the context as to not change prepositions, pronouns, conjunctions, determiners, and auxiliary verbs: '{context}', now please give a simpler synonym for the word: '{word}', but ONLY write the word itself, no explanation."
            }],
            model="gpt-3.5-turbo",
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

# Function to get a translation (ESL mode) using OpenAI API
def get_translated_word(word, context, target_language="Korean"):
    try:
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"Take in the context: '{context}', now please translate the word: '{word}' into {target_language}. Only provide the translated word, no explanations."
            }],
            model="gpt-3.5-turbo",
            temperature=0.4,
            max_tokens=4,
            stream=False
        )
        translated_word = response.choices[0].message.content.strip()
        print(f"API response for '{word}': {translated_word}")
        return translated_word
    except Exception as e:
        print(f"Error querying OpenAI API: {e}")
        return None

# Function to get a dyslexia-friendly synonym (equal difficulty) using OpenAI API
def get_dyslexia_synonym(word, context):
    try:
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"If the input word is one of the following: 'this', 'that', 'such', 'of', 'is', 'my', 'and', 'an', 'a', do not change it, and return the word as it is. If it is not one of these words, return a synonym of equal difficulty to '{word}'. Return only ONE word, no explanation, and DO NOT change the part of speech of the word."
            }],
            model="gpt-3.5-turbo",
            temperature=0.4,
            max_tokens=4,
            stream=False
        )
        synonym = response.choices[0].message.content.strip()
        print(f"API response for '{word}': {synonym}")
        return synonym
    except Exception as e:
        print(f"Error querying OpenAI API: {e}")
        return None

# Function to separate the word from its punctuation
def separate_word_punctuation(word):
    suffix_punct = ""
    while word and word[-1] in string.punctuation:
        suffix_punct = word[-1] + suffix_punct
        word = word[:-1]
    
    prefix_punct = ""
    while word and word[0] in string.punctuation:
        prefix_punct = prefix_punct + word[0]
        word = word[1:]

    return word, prefix_punct, suffix_punct

# Function to replace word with simpler synonym or translation based on mode
def replace_word_based_on_mode(word, context, mode, is_first_word=False):
    original_word = word
    word, prefix_punct, suffix_punct = separate_word_punctuation(word)

    # Choose the function based on the mode
    if mode == "simplify":
        new_word = get_simpler_word(word, context)
    elif mode == "esl":
        new_word = get_translated_word(word, context)
    elif mode == "dyslexia":
        new_word = get_dyslexia_synonym(word, context)
    else:
        new_word = word  # No change if mode is unrecognized

    if new_word and new_word.lower() != word.lower():
        if is_first_word or original_word[0].isupper():
            new_word = new_word.capitalize()
        return prefix_punct + new_word + suffix_punct

    return original_word

# Handle WebSocket for word detection
@socketio.on('word_detection')
def handle_word_detection(data):
    word = data['word']
    context = data['context']
    mode = data.get('mode', 'simplify')  # Default mode is simplify if not provided

    print(f"Received word: {word}, Context: {context}, Mode: {mode}")

    simpler_word = replace_word_based_on_mode(word, context, mode)

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
