from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from typing import Optional, List
from pydantic import field_validator

CLASSES_EPI_DISPONIVEIS = [
    "helmet",
    "safety-vest",
    "glasses",
    "gloves",
    "earmuffs",
    "face-mask-medical",
    "face-guard",
    "medical-suit",
    "safety-suit",
]

class SectorBase(BaseModel):
    name: str
    description: Optional[str] = None
    epis_obrigatorios: List[str] = []  

class SectorCreate(SectorBase):
    pass

class SectorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    epis_obrigatorios: Optional[List[str]] = None  

class SectorResponse(SectorBase):
    id: int
    created_at: datetime
    epis_obrigatorios: List[str] = []   

    @field_validator("epis_obrigatorios", mode="before")
    @classmethod
    def nulo_vira_lista(cls, v):
        return v if v is not None else []

    model_config = {"from_attributes": True}

class SectorStats(BaseModel):
    sector_id: int
    sector_name: str
    epis_obrigatorios: List[str]
    total_ocorrencias: int
    conformes: int
    nao_conformes: int
    taxa_conformidade: float        
    epis_mais_ausentes: List[dict]
