import logging
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from app.core.config import settings

logger = logging.getLogger(__name__)

class Retriever:
    def __init__(self):
        embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        self._store = PineconeVectorStore(
            index_name=settings.PINECONE_INDEX,
            embedding=embeddings,
        )

    def retrieve(self, query: str, k: int = 4) -> list[str]:
        try:
            docs = self._store.similarity_search(query, k=k)
            return [d.page_content for d in docs]
        except Exception as exc:
            logger.error("Retrieval error: %s", exc)
            return []
