from keybert import KeyBERT
import sys 

kw_model = KeyBERT()
# keywords = kw_model.extract_keywords(sys.argv[1], keyphrase_ngram_range=(2, 2))
keywords = kw_model.extract_keywords('"Fintie Folio Case for All-New Amazon Fire HD 10 and 10 Plus Tablet (13th/11th Generation, 2023/2021 Release) 10.1" - Slim Fit Standing Cover with Auto Sleep/Wake, Black"', keyphrase_ngram_range=(2, 2), top_n=5)

print(keywords)