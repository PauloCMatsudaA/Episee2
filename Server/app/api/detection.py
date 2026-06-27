import asyncio
import json
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.deps import get_current_user
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
    current_user: User = Depends(get_current_user),
):
    q = sse_subscribe()

    async def generator():
        try:
            yield 'data: {"tipo": "conectado"}\n\n'
            while True:
                if await request.is_disconnected():
                    break
                try:
                    evento = await asyncio.wait_for(q.get(), timeout=25.0)
                    payload = json.dumps(evento, ensure_ascii=False)
                    yield f"data: {payload}\n\n"
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
    Endpoint para testes: dispara um evento SSE de nao-conformidade simulado
    sem precisar da camera ou do modelo YOLO rodando.
    """
    ausentes = [e.strip() for e in epi_ausente.split(",") if e.strip()]
    evento = {
        "id":             0,
        "camera_id":      camera_id,
        "sector_id":      sector_id,
        "epi_detected":   ["safety-vest"],
        "epis_ausentes":  ausentes,
        "confidence":     0.91,
        "timestamp":      datetime.utcnow().isoformat() + "Z",
        "texto":          f"[SIMULADO] Faltando: {', '.join(ausentes)} — Camera {camera_id}",
    }
    _sse_publish(evento)
    return JSONResponse({"ok": True, "evento_publicado": evento})
