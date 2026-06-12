"""
RAG Retriever — Busca os chunks mais relevantes da NR-6 para uma query.
"""
import pickle
import numpy as np
from pathlib import Path
from functools import lru_cache
from openai import OpenAI
from app.core.config import get_settings

EMBEDDING_MODEL = "text-embedding-3-small"


@lru_cache(maxsize=1)
def _load_index_and_meta():
    """Carrega o índice FAISS e metadados (singleton em cache)."""
    import faiss

    settings = get_settings()
    index_path = Path(settings.faiss_index_path)
    meta_path = index_path.with_suffix(".meta.pkl")

    if not index_path.exists():
        raise FileNotFoundError(
            f"Índice FAISS não encontrado em '{index_path}'.\n"
            "Execute: python -m app.rag.indexer"
        )

    index = faiss.read_index(str(index_path))
    with open(meta_path, "rb") as f:
        chunks = pickle.load(f)

    return index, chunks


def retrieve_relevant_chunks(query: str, client: OpenAI, top_k: int = 4) -> list[dict]:
    """
    Retorna os top_k chunks da NR-6 mais relevantes para a query.
    """
    import faiss

    index, chunks = _load_index_and_meta()

    # Gera embedding da query
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query],
    )
    query_vec = np.array([response.data[0].embedding], dtype="float32")
    faiss.normalize_L2(query_vec)

    # Busca no índice
    scores, indices = index.search(query_vec, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx >= 0:  # FAISS retorna -1 para slots vazios
            chunk = chunks[idx].copy()
            chunk["score"] = float(score)
            results.append(chunk)

    return results


def format_context(chunks: list[dict]) -> str:
    """
    Formata os chunks recuperados como bloco de contexto para o prompt.
    """
    if not chunks:
        return "Nenhum trecho relevante da NR-6 encontrado."

    lines = ["=== TRECHOS RELEVANTES DA NR-6 ===\n"]
    for i, chunk in enumerate(chunks, 1):
        lines.append(f"[{i}] {chunk['titulo']}")
        lines.append(chunk["texto"])
        lines.append("")

    return "\n".join(lines)
