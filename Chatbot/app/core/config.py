from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "episee"
    PINECONE_ENV: str = "gcp-starter"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""
    TELEGRAM_BOT_TOKEN: str = ""
    SERVER_BASE_URL: str = "http://localhost:8001"
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
