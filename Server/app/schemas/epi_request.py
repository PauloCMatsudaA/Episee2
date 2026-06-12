from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.epi_request import EPIRequestStatus


class EPIRequestBase(BaseModel):
    epi_type: str
    reason: Optional[str] = None
    sector_id: int


class EPIRequestCreate(EPIRequestBase):
    pass


class EPIRequestUpdate(BaseModel):
    epi_type: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[EPIRequestStatus] = None


class EPIRequestResponse(EPIRequestBase):
    id: int
    worker_id: int
    status: EPIRequestStatus
    manager_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EPIRequestApproveReject(BaseModel):
    reason: Optional[str] = None
