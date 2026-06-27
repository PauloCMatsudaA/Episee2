import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import decode_token
from app.models.user import User
from app.services.detection_service_real import analyze_frame, sse_subscribe, sse_unsubscribe, _sse_publish

router = APIRouter(prefix="/detection", tags=["Detection"])


@router.post("/analyze-frame")
async def analyze_frame_endpoint(
    camera_id: int = Form(...),
    frame: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    frame_data = await frame.read()
    result = await analyze_frame(camera_id=camera_id, frame_data=frame_data)
    return JSONResponse(content=result)


@router.get("/stream")
async def detection_stream(
    request: Request,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Valida token manualmente (EventSource nao suporta headers customizados)
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilizador nao encontrado")

    q = sse_subscribe()

    async def generator():
        try:
            yield 'data: {"tipo": "conectado"}\n\n'
            while True:
                if await request.is_disconnected():
                    break
                try:
                    evento = await asyncio.wait_for(q.get(), timeout=25.0)
                    payload_str = json.dumps(evento, ensure_ascii=False)
                    yield f"data: {payload_str}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            sse_unsubscribe(q)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/simulate")
async def simulate_detection(
    camera_id: int = Form(1),
    sector_id: int = Form(1),
    epi_ausente: str = Form("helmet"),
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint de teste: dispara evento SSE sem precisar de camera ou YOLO.
    """
    ausentes = [e.strip() for e in epi_ausente.split(",") if e.strip()]
    evento = {
        "id":            0,
        "camera_id":     camera_id,
        "sector_id":     sector_id,
        "epi_detected":  ["safety-vest"],
        "epis_ausentes": ausentes,
        "confidence":    0.91,
        "timestamp":     datetime.utcnow().isoformat() + "Z",
        "texto":         f"[SIMULADO] Faltando: {', '.join(ausentes)} — Camera {camera_id}",
    }
    _sse_publish(evento)
    return JSONResponse({"ok": True, "evento_publicado": evento})
