import translators as ts
import sys

# Function to split text into smaller chunks
def split_text(text, max_length):
    words = text.split(' ')
    chunks = []
    current_chunk = []
    
    for word in words:
        if len(' '.join(current_chunk + [word])) <= max_length:
            current_chunk.append(word)
        else:
            chunks.append(' '.join(current_chunk))
            current_chunk = [word]
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def translate_large_text(text, max_length=2000, to_language='en'):
    chunks = split_text(text, max_length)
    translated_chunks = [ts.translate_text(chunk, to_language=to_language) for chunk in chunks]
    return ' '.join(translated_chunks)

# Main code
if __name__ == "__main__":
    input_text = str(sys.argv[1])
    
    try:
        # Call the translation function
        result = translate_large_text(input_text, max_length=2000)  # Set max_length as per the API limit
        print(result)
    except Exception as e:
        print(sys.argv[1])
