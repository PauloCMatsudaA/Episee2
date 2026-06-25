import os
import logging
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_pinecone_index():
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    existing = [i.name for i in pc.list_indexes()]
    if settings.PINECONE_INDEX not in existing:
        pc.create_index(
            name=settings.PINECONE_INDEX,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
    return pc.Index(settings.PINECONE_INDEX)

def index_documents(docs_path: str = "data/") -> int:
    docs_dir = Path(docs_path)
    if not docs_dir.exists():
        logger.warning("Docs directory not found: %s", docs_path)
        return 0

    all_docs = []
    for file in docs_dir.rglob("*"):
        if file.suffix == ".pdf":
            loader = PyPDFLoader(str(file))
        elif file.suffix in (".txt", ".md"):
            loader = TextLoader(str(file), encoding="utf-8")
        else:
            continue
        all_docs.extend(loader.load())

    if not all_docs:
        logger.info("No documents found to index.")
        return 0

    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    chunks = splitter.split_documents(all_docs)

    embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
    PineconeVectorStore.from_documents(
        chunks,
        embedding=embeddings,
        index_name=settings.PINECONE_INDEX,
    )
    logger.info("Indexed %d chunks from %d documents.", len(chunks), len(all_docs))
    return len(chunks)
