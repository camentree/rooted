import faiss  # type: ignore
import numpy as np
import ollama


EMBEDDING_MODEL = "nomic-embed-text"
EMBEDDING_SIZE = 768


def embed(text):
    print(text)
    try:
        response = ollama.embeddings(model=EMBEDDING_MODEL, prompt=text)
        print(response)
        return np.array(response["embedding"], dtype=np.float32)
    except Exception as error:
        print(f"Error generating embedding: {error}")
        return None


def construct_index():
    return faiss.IndexHNSWFlat(EMBEDDING_SIZE, 32)
