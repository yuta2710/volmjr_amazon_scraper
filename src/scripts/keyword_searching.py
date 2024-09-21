# from keybert import KeyBERT
# import sys 

# kw_model = KeyBERT()
# # keywords = kw_model.extract_keywords(sys.argv[1], keyphrase_ngram_range=(2, 2))
# keywords = kw_model.extract_keywords('"Fintie Folio Case for All-New Amazon Fire HD 10 and 10 Plus Tablet (13th/11th Generation, 2023/2021 Release) 10.1" - Slim Fit Standing Cover with Auto Sleep/Wake, Black"', keyphrase_ngram_range=(2, 2), top_n=5)

# print(keywords)

# import spacy
# from spacy.lang.en.examples import sentences 

# nlp = spacy.load("en_core_web_sm")

# sentence1 = nlp("coconut wraps")
# sentence2 = nlp('NUCO Certified ORGANIC Paleo Gluten Free Vegan "Turmeric" Coconut Wraps, 5 Count (One Pack of Five Wraps)')

# similarity = sentence1.similarity(sentence2)
# print(similarity)
import transformers
import numpy as np
import torch

# Load the BERT model and tokenizer

# Tokenize and encode the texts
text1 = "coconut wraps"
text2 = 'NUCO Certified ORGANIC Paleo Gluten Free Vegan "Turmeric" Coconut Wraps, 5 Count (One Pack of Five Wraps)'

model = transformers.BertModel.from_pretrained('bert-base-uncased')
tokenizer = transformers.BertTokenizer.from_pretrained('bert-base-uncased')

# Tokenize the inputs
inputs1 = tokenizer(text1, return_tensors='pt', padding=True, truncation=True)
inputs2 = tokenizer(text2, return_tensors='pt', padding=True, truncation=True)

# Get the embeddings (last hidden state of the [CLS] token)
with torch.no_grad():
    outputs1 = model(**inputs1)
    outputs2 = model(**inputs2)

# Extract embeddings for the [CLS] token (the first token)
embedding1 = outputs1.last_hidden_state[:, 0, :]
embedding2 = outputs2.last_hidden_state[:, 0, :]

# Calculate the cosine similarity between the embeddings
cosine_similarity = torch.nn.functional.cosine_similarity(embedding1, embedding2)

print(f"Cosine Similarity: {cosine_similarity.item()}")
