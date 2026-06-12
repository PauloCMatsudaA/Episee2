"""
RAG Indexer — Cria e salva o índice FAISS com embeddings da NR-6.
Execute este script uma vez para gerar o índice:
    python -m app.rag.indexer
"""
import json
import pickle
import os
import numpy as np
from pathlib import Path
from openai import OpenAI
from app.core.config import get_settings
import glob

EMBEDDING_MODEL = "text-embedding-3-small"
arquivos = glob.glob("data/nr6_chunks/*.json")
todos_chunks = []
for arquivo in arquivos:
    with open(arquivo, "r", encoding="utf-8") as f:
        todos_chunks.extend(json.load(f))

def load_chunks(chunks_path: str) -> list[dict]:
    """Carrega todos os arquivos JSON da pasta de chunks."""
    chunks = []
    for file in Path(chunks_path).glob("*.json"):
        with open(file, encoding="utf-8") as f:
            data = json.load(f)
            chunks.extend(data)
    return chunks


def get_embeddings(texts: list[str], client: OpenAI) -> np.ndarray:
    """Gera embeddings para uma lista de textos via OpenAI."""
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    return np.array([item.embedding for item in response.data], dtype="float32")


def build_index():
    """Constrói e salva o índice FAISS + metadados dos chunks."""
    import faiss

    settings = get_settings()
    client = OpenAI(api_key=settings.openai_api_key)

    print("Carregando chunks da NR-6...")
    chunks = load_chunks(settings.nr6_chunks_path)
    print(f"  → {len(chunks)} chunks encontrados.")

    texts = [
    f"{c.get('titulo') or c.get('secao') or c.get('fonte', '')}\n{c['texto']}"
    for c in chunks
]
    print("Gerando embeddings via OpenAI...")
    embeddings = get_embeddings(texts, client)
    print(f"  → Embeddings gerados: shape {embeddings.shape}")

    # Normaliza para busca por cosseno
    faiss.normalize_L2(embeddings)

    # Cria índice FAISS (Inner Product = cosseno após normalização)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    # Salva índice e metadados
    index_path = Path(settings.faiss_index_path)
    index_path.parent.mkdir(parents=True, exist_ok=True)

    faiss.write_index(index, str(index_path))

    metadata_path = index_path.with_suffix(".meta.pkl")
    with open(metadata_path, "wb") as f:
        pickle.dump(chunks, f)

    print(f"Índice salvo em: {index_path}")
    print(f"Metadados salvos em: {metadata_path}")
    print("Indexação concluída.")


if __name__ == "__main__":
    build_index()
