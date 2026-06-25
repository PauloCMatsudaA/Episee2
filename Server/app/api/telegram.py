from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.telegram_service import gerar_link_code, processar_webhook

router = APIRouter(prefix="/telegram", tags=["Telegram"])

@router.post("/gerar-codigo")
async def gerar_codigo_vinculacao(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    
    codigo = gerar_link_code()
    current_user.telegram_link_code = codigo
    await db.commit()
    return {
        "codigo": codigo,
        "bot": "@episee_bot",          
        "instrucao": f"/vincular {codigo}",
    }

@router.post("/webhook")
async def telegram_webhook(request: Request):
    
    update = await request.json()
    await processar_webhook(update)
    return {"ok": True}

@router.get("/status")
async def telegram_status(current_user: User = Depends(get_current_user)):
    return {
        "vinculado": bool(current_user.telegram_chat_id),
        "chat_id": current_user.telegram_chat_id or None,
    }
