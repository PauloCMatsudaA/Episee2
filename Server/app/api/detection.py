import asyncio
import json
from fastapi import APIRouter, Depends, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.deps import get_current_user
from app.models.user import User
from app.services.detection_service_real import analyze_frame, sse_subscribe, sse_unsubscribe

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
            yield "data: {\"tipo\": \"conectado\"}\n\n"
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
