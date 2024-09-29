from openai import OpenAI
import os
import string

# Initialize the OpenAI client with the API key
client = OpenAI(api_key=os.environ.get("OPENAI_API"))

# Function to get the translated word using the OpenAI API
def get_translated_word(word, context, target_language="Korean"):
    try:
        # Use the OpenAI API to get a translation for the word into the target language
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"Take in the context: '{context}', now please translate the word: '{word}' into {target_language}. Only provide the translated word, no explanations."
            }],
            model="gpt-3.5-turbo",  # Changed model to GPT-3.5 Turbo
            temperature=0.4,
            max_tokens=4,  # Limit response to a short word
            stream=False
        )
        # Extract the translated word from the response
        translated_word = response.choices[0].message.content.strip()
        print(f"API response for '{word}': {translated_word}")
        return translated_word
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

# Function to replace a word with its translation if available
def replace_with_translation(word, context, is_first_word=False):
    original_word = word

    # Separate punctuation from the word
    word, prefix_punct, suffix_punct = separate_word_punctuation(word)

    # Get the translated word based on context
    translated_word = get_translated_word(word, context)

    if translated_word and translated_word.lower() != word:
        # Capitalize the first word of the sentence or if the original word was capitalized
        if is_first_word or original_word[0].isupper():
            translated_word = translated_word.capitalize()
        else:
            translated_word = translated_word.lower()

        print(f"Replacing '{original_word}' with translated word: '{translated_word}'")
        # Reattach punctuation
        return prefix_punct + translated_word + suffix_punct
    else:
        print(f"No translation found for '{original_word}'. Keeping original.")
        return original_word
