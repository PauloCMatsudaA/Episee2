from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, field_validator
from app.models.occurrence import OccurrenceStatus

class OccurrenceBase(BaseModel):
    
    camera_id: Optional[int] = None
    sector_id: Optional[int] = None
    status: OccurrenceStatus = OccurrenceStatus.conforme
    epi_detected: List[Any] = []
    confidence: Optional[float] = None
    image_path: Optional[str] = None

    @field_validator("epi_detected", mode="before")
    @classmethod
    def nulo_vira_lista(cls, v):
        return v if v is not None else []

class OccurrenceCreate(OccurrenceBase):
    timestamp: Optional[datetime] = None

class OccurrenceUpdate(BaseModel):
    status: Optional[OccurrenceStatus] = None
    epi_detected: Optional[List[Any]] = None
    confidence: Optional[float] = None
    image_path: Optional[str] = None

class OccurrenceResponse(OccurrenceBase):
    id: int
    timestamp: datetime
    created_at: datetime
    camera_name: Optional[str] = None
    sector_name: Optional[str] = None

    model_config = {"from_attributes": True}

class OccurrenceSummary(BaseModel):
    total: int
    conforme: int
    nao_conforme: int
    compliance_rate: float
    today_non_compliant: int
