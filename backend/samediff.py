from openai import OpenAI
import os
import string

# Initialize the OpenAI client with the API key
client = OpenAI(api_key=os.environ.get("OPENAI_API"))

# Function to get a synonym of equal difficulty using the OpenAI API
def get_equal_difficulty_synonym(word, context):
    try:
        # Use the OpenAI API to get a synonym with the same level of difficulty
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"If the input word is one of the following: 'this', 'that', 'such', 'of', 'is', 'my', 'and', 'an', 'a', do not change it, and return the word as it is. If it is not one of these words, return a synonym of equal difficulty to '{word}'. Return only ONE word, no explanation, and DO NOT change the part of speech of the word."
            }],
            model="gpt-4o-mini",
            temperature=0.4,
            max_tokens=4,
            stream=False
        )

        # Extract the synonym from the response
        synonym = response.choices[0].message.content.strip()
        print(f"API response for '{word}': {synonym}")
        return synonym
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

# Function to replace a word with a synonym of equal difficulty if available
def replace_with_equal_synonym(word, context, is_first_word=False):
    original_word = word

    # Separate punctuation from the word
    word, prefix_punct, suffix_punct = separate_word_punctuation(word)

    # Get the synonym with equal difficulty based on context
    equal_synonym = get_equal_difficulty_synonym(word, context)

    if equal_synonym and equal_synonym.lower() != word:
        # Capitalize the first word of the sentence or if the original word was capitalized
        if is_first_word or original_word[0].isupper():
            equal_synonym = equal_synonym.capitalize()
        else:
            equal_synonym = equal_synonym.lower()

        print(f"Replacing '{original_word}' with synonym of equal difficulty: '{equal_synonym}'")
        # Reattach punctuation
        return prefix_punct + equal_synonym + suffix_punct
    else:
        print(f"No synonym of equal difficulty found for '{original_word}'. Keeping original.")
        return original_word

# Example text input
text = "That gentleman exhibits an extraordinary level of equanimity, exuding an aura of serene composure that transcends conventional emotional turbulence."

# Process each word in the text, while providing context
processed_text = []
words = text.split()

for i, word in enumerate(words):
    is_first_word = (i == 0)  # Check if it's the first word of the sentence
    context = " ".join(words[max(0, i-3):i+4])  # Provide context for the word (3 words before and after)
    equal_synonym = replace_with_equal_synonym(word, text, is_first_word)
    processed_text.append(equal_synonym)

# Join the processed words back into a sentence
result = " ".join(processed_text)
print("\nOriginal text:", text)
print("Processed text:", result)
