from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.chat_service import ChatService

router = APIRouter()
chat_service = ChatService()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    user_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    audio_url: str | None = None

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        result = await chat_service.process(
            message=request.message,
            session_id=request.session_id,
            user_id=request.user_id,
        )
        return ChatResponse(
            response=result["text"],
            session_id=request.session_id,
            audio_url=result.get("audio_url"),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
