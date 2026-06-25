from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator
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
    worker_name: Optional[str] = None
    sector_name: Optional[str] = None
    status: EPIRequestStatus
    manager_id: Optional[int] = None
    entregue: Optional[bool] = None
    motivo_rejeicao: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def resolver_nomes(self) -> "EPIRequestResponse":
        
        return self

class EPIRequestApproveReject(BaseModel):
    motivo_rejeicao: Optional[str] = None

class EPIRequestEntrega(BaseModel):
    entregue: bool
