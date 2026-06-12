from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str

    # WhatsApp
    whatsapp_phone_number_id: str
    whatsapp_access_token: str
    whatsapp_verify_token: str = "episee_webhook_token"

    # Chatbot
    gpt_model: str = "gpt-4o"
    max_history_messages: int = 10
    max_tokens_response: int = 800

    # RAG
    faiss_index_path: str = "data/faiss_index.bin"
    nr6_chunks_path: str = "data/nr6_chunks"
    top_k_chunks: int = 4

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
