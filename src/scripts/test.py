# print("Hello World")

# from multi_rake import Rake

# fullText = "In the text mining tasks, textual representation should be not only efficient but also interpretable, as this enables an understanding of the operational logic underlying the data mining models. Traditional text vectorization methods such as TF-IDF and bag-of-words are effective and characterized by intuitive interpretability, but suffer from the «curse of dimensionality», and they are unable to capture the meanings of words. On the other hand, modern distributed methods effectively capture the hidden semantics, but they are computationally intensive, time-consuming, and uninterpretable. This article proposes a new text vectorization method called Bag of weighted Concepts BoWC that presents a document according to the concepts’ information it contains. The proposed method creates concepts by clustering word vectors (i.e. word embedding) then uses the frequencies of these concept clusters to represent document vectors. To enrich the resulted document representation, a new modified weighting function is proposed for weighting concepts based on statistics extracted from word embedding information. The generated vectors are characterized by interpretability, low dimensionality, high accuracy, and low computational costs when used in data mining tasks. The proposed method has been tested on five different benchmark datasets in two data mining tasks; document clustering and classification, and compared with several baselines, including Bag-of-words, TF-IDF, Averaged GloVe, Bag-of-Concepts, and VLAC. The results indicate that BoWC outperforms most baselines and gives 7% better accuracy on average"

# rake = Rake()
# # keywords = rake.apply("Tanisa Rice Paper, 38 Sheets Organic Rice Paper Wrappers, Low carb tortilla, Spring roll wrappers, Gluten FREE wraps (22cm, 12 oz) Non GMO Banh Trang Goi Cuon")
# keywords = rake.apply(fullText)
# print(keywords[:10])

# import nltk
# from sklearn.feature_extraction.text import TfidfVectorizer
# from nltk import word_tokenize, pos_tag
# from nltk.corpus import stopwords
# from collections import defaultdict

# # Download necessary data
# nltk.download('punkt_tab')
# nltk.download('averaged_perceptron_tagger_eng')
# nltk.download('stopwords')

# # Example title
# titles = ["Tanisa Rice Paper, 38 Sheets Organic Rice Paper Wrappers, Low carb tortilla, Spring roll wrappers, Gluten FREE wraps"]

# # Function to extract noun phrases (keywords)
# def extract_noun_phrases(title):
#     tokens = word_tokenize(title)
#     pos_tags = pos_tag(tokens)

#     noun_phrases = []
#     for word, tag in pos_tags:
#         # Extract nouns (NN) or proper nouns (NNP) or noun phrases
#         if tag in ['NN', 'NNS', 'NNP', 'NNPS']:
#             noun_phrases.append(word)
#     return noun_phrases

# Apply the function to all titles
# all_noun_phrases = []
# for title in titles:
#     all_noun_phrases.extend(extract_noun_phrases(title))

# print("Extracted Noun Phrases:", extract_noun_phrases(titles[0]))
from keybert import KeyBERT

data = {'sentence': [
    "Tanisa Rice Paper, 38 Sheets Organic Rice Paper Wrappers, Low carb tortilla, Spring roll wrappers, Gluten FREE wraps (22cm, 12 oz) Non GMO Banh Trang Goi Cuon",
    "Organic Rice Paper Wraps, Wrappers for Fresh Spring Rolls, Dumplings, Crispy Rice Paper Rolls (22cm, 7oz) Vietnamese Banh Trang | USDA Organic NON GMO, Gluten-Free | Vegan & Paleo | Halal",
    "BIODANCE Bio-Collagen Real Deep Mask, Hydrating Overnight Hydrogel Mask, Pore Minimizing, Elasticity Improvement, 34g x4ea",
    "The cat sat on the mat."
]}

kw_model = KeyBERT()
keywords = kw_model.extract_keywords(
  data['sentence'][2], 
  keyphrase_ngram_range=(2, 2),
  highlight=True, 
  stop_words='english',
  top_n=1
)

print(keywords)