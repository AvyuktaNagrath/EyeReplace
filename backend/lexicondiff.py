from openai import OpenAI
import os
import string

# Initialize the OpenAI client with the API key
client = OpenAI(api_key=os.environ.get("OPENAI_API"))

# Function to get a simpler word using the OpenAI API
def get_simpler_word(word, context):
    try:
        # Use the OpenAI API to get a simpler word with the given context
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"Take in the context as to not change prepositions, pronouns, conjunctions, determiners, and auxillary verbs: '{context}', now please give a simpler synonym for the word: '{word}', but ONLY write the word itself, no explanation."
            }],
            model="gpt-4o-mini",
            temperature=0.4,
            max_tokens=4,
            stream=False
        )
        # Extract the simpler word from the response
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

    # Separate punctuation from the word
    word, prefix_punct, suffix_punct = separate_word_punctuation(word)

    # Get the simpler word based on context
    simpler_word = get_simpler_word(word, context)

    if simpler_word and simpler_word.lower() != word:
        # Capitalize the first word of the sentence or if the original word was capitalized
        if is_first_word or original_word[0].isupper():
            simpler_word = simpler_word.capitalize()
        else:
            simpler_word = simpler_word.lower()

        print(f"Replacing '{original_word}' with simpler word: '{simpler_word}'")
        # Reattach punctuation
        return prefix_punct + simpler_word + suffix_punct
    else:
        print(f"No simpler word found for '{original_word}'. Keeping original.")
        return original_word

# Example text input
text = "That gentleman exhibits an extraordinary level of equanimity, exuding an aura of serene composure that transcends conventional emotional turbulence."

# Process each word in the text, while providing context
processed_text = []
words = text.split()

for i, word in enumerate(words):
    is_first_word = (i == 0)  # Check if it's the first word of the sentence
    context = " ".join(words[max(0, i-3):i+4])  # Provide context for the word (3 words before and after)
    simpler_word = replace_with_easier_synonym(word, text, is_first_word)
    processed_text.append(simpler_word)

# Join the processed words back into a sentence
result = " ".join(processed_text)
print("\nOriginal text:", text)
print("Processed text:", result)
