from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class SectorInfo(BaseModel):
    id: int
    name: str
    epis_obrigatorios: list[str] = []

    model_config = {"from_attributes": True}

class CameraBase(BaseModel):
    name: str
    location: Optional[str] = None
    sector_id: Optional[int] = None
    rtsp_url: Optional[str] = None
    is_active: bool = True

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    sector_id: Optional[int] = None
    rtsp_url: Optional[str] = None
    is_active: Optional[bool] = None

class CameraResponse(CameraBase):
    id: int
    last_seen: Optional[datetime] = None
    created_at: datetime
    sector: Optional[SectorInfo] = None

    model_config = {"from_attributes": True}

class DetectionControl(BaseModel):
    camera_id: int
    action: str
    message: str
    instructions: Optional[str] = None
