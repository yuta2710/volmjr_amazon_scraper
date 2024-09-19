import sys
import json
from sentence_transformers import SentenceTransformer, util

# Initialize the SentenceTransformer model
model = SentenceTransformer("all-distilroberta-v1")

# Load the unfiltered competitors from the command line argument
try:
    unfiltered_competitors = json.loads(sys.argv[2])
except json.JSONDecodeError as e:
    print(f"Error decoding JSON: {e}")
    sys.exit(1)

# Encode the query using the model
query_embedding = model.encode(sys.argv[1])

# Prepare to collect results
results = []

# Iterate over each product, compute the cosine similarity, and store the result
for product in unfiltered_competitors:
    product_embedding = model.encode(product)
    similarity_score = util.cos_sim(query_embedding, product_embedding)[0][0].item()  # Extract the scalar value of the similarity score

    # Append the result as a dictionary to the results list
    results.append({
        "title": product,
        "similarity_score": similarity_score
    })

# Optionally, you can sort the results by similarity score in descending order
results.sort(key=lambda x: x['similarity_score'], reverse=True)

# Print or return the results
print(json.dumps(results, indent=4, ensure_ascii=False))
