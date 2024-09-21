import sys
import json
from sentence_transformers import SentenceTransformer, util

# Initialize the SentenceTransformer model
model = SentenceTransformer("all-distilroberta-v1")

# Encode the query and competitor using the model
query_embedding = model.encode(sys.argv[1])         # First argument: Query
competitor_title = sys.argv[2]                      # Second argument: Competitor title (string)
competitor_embedding = model.encode(competitor_title)  # Encode the competitor's title

# Compute cosine similarity
similarity_score = util.cos_sim(query_embedding, competitor_embedding)[0][0].item()  # Extract the scalar value of the similarity score

# Create a result dictionary
result = {
    "title": competitor_title,  # Include the competitor's title
    "similarity_score": similarity_score
}

# Print the result as a JSON string
print(json.dumps(result, indent=4, ensure_ascii=False))



# import sys
# import json
# from sentence_transformers import SentenceTransformer, util

# # Initialize the SentenceTransformer model
# model = SentenceTransformer("all-distilroberta-v1")

# # Load the unfiltered competitors from the command line argument
# try:
#     unfiltered_competitors = json.loads(sys.argv[2])
# except json.JSONDecodeError as e:
#     print(f"Error decoding JSON: {e}")
#     sys.exit(1)

# # Encode the query using the model
# query_embedding = model.encode(sys.argv[1])

# # Prepare to collect results
# results = []

# # Iterate over each product, compute the cosine similarity, and store the result
# for product in unfiltered_competitors:
#     product_embedding = model.encode(product)
#     similarity_score = util.cos_sim(query_embedding, product_embedding)[0][0].item()  # Extract the scalar value of the similarity score

#     # Append the result as a dictionary to the results list
#     results.append({
#         "title": product,
#         "similarity_score": similarity_score
#     })

# # Optionally, you can sort the results by similarity score in descending order
# results.sort(key=lambda x: x['similarity_score'], reverse=True)

# # Print or return the results
# print(json.dumps(results, indent=4, ensure_ascii=False))




# import sys
# import json
# import torch
# import transformers

# my_title = sys.argv[1]
# competitor_title = sys.argv[2]                      # Second argument: Competitor title (string)

# # Load the BERT model and tokenizer
# model = transformers.BertModel.from_pretrained('bert-base-uncased')
# tokenizer = transformers.BertTokenizer.from_pretrained('bert-base-uncased')

# # Tokenize the inputs
# inputs1 = tokenizer(my_title, return_tensors='pt', padding=True, truncation=True)
# inputs2 = tokenizer(competitor_title, return_tensors='pt', padding=True, truncation=True)

# # Get the embeddings (last hidden state of the [CLS] token)
# with torch.no_grad():
#     outputs1 = model(**inputs1)
#     outputs2 = model(**inputs2)

# # Extract embeddings for the [CLS] token (the first token)
# embedding1 = outputs1.last_hidden_state[:, 0, :]
# embedding2 = outputs2.last_hidden_state[:, 0, :]

# # Calculate the cosine similarity between the embeddings
# cosine_similarity = torch.nn.functional.cosine_similarity(embedding1, embedding2)

# # Convert the tensor to a Python float for JSON serialization
# similarity_score = cosine_similarity.item()

# # Create a result dictionary
# result = {
#     "title": competitor_title,  # Include the competitor's title
#     "similarity_score": str(similarity_score)  # Convert the tensor to a float
# }

# # Print the result as a JSON string
# print(json.dumps(result, indent=4, ensure_ascii=False))
