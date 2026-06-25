from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

class TrainingVideoBase(BaseModel):
    titulo:     str
    url:        str
    descricao:  Optional[str] = None
    fonte:      Optional[str] = None
    aprovado:   bool = True
    prioridade: int  = 0

class TrainingVideoCreate(TrainingVideoBase):
    epi_type_id: int

class TrainingVideoUpdate(BaseModel):
    titulo:     Optional[str] = None
    url:        Optional[str] = None
    descricao:  Optional[str] = None
    fonte:      Optional[str] = None
    aprovado:   Optional[bool] = None
    prioridade: Optional[int]  = None

class TrainingVideoResponse(TrainingVideoBase):
    id:          int
    epi_type_id: int
    criado_em:   datetime

    class Config:
        from_attributes = True

TrainingVideoOut = TrainingVideoResponse

class EpiTypeBase(BaseModel):
    nome:           str
    descricao:      Optional[str] = None
    quando_usar:    Optional[str] = None
    como_usar:      Optional[str] = None
    erros_comuns:   Optional[str] = None
    nr6_ref:        Optional[str] = None
    palavras_chave: Optional[str] = None  

class EpiTypeCreate(EpiTypeBase):
    pass

class EpiTypeUpdate(BaseModel):
    nome:           Optional[str] = None
    descricao:      Optional[str] = None
    quando_usar:    Optional[str] = None
    como_usar:      Optional[str] = None
    erros_comuns:   Optional[str] = None
    nr6_ref:        Optional[str] = None
    palavras_chave: Optional[str] = None

class EpiTypeResponse(EpiTypeBase):
    id:        int
    criado_em: datetime
    videos:    List[TrainingVideoResponse] = []

    class Config:
        from_attributes = True

EpiTypeOut = EpiTypeResponse
