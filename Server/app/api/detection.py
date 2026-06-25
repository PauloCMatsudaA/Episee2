from fastapi import APIRouter, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user
from app.models.user import User
from app.services.detection_service_real import analyze_frame

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
