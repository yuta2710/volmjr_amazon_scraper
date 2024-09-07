from keybert import KeyBERT
import sys 

kw_model = KeyBERT()
keywords = kw_model.extract_keywords(sys.argv[1], keyphrase_ngram_range=(2, 2))

print(keywords)