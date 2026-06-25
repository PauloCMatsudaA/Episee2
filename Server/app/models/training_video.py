from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base

class EpiType(Base):
    
    __tablename__ = "epi_types"

    id            = Column(Integer, primary_key=True, index=True)
    nome          = Column(String(100), nullable=False, unique=True)
    descricao     = Column(Text, nullable=True)
    quando_usar   = Column(Text, nullable=True)
    como_usar     = Column(Text, nullable=True)
    erros_comuns  = Column(Text, nullable=True)
    nr6_ref       = Column(String(100), nullable=True)
    
    palavras_chave = Column(Text, nullable=True)
    criado_em     = Column(DateTime, server_default=func.now(), nullable=False)

    videos = relationship(
        "TrainingVideo",
        back_populates="epi_type",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

class TrainingVideo(Base):
    
    __tablename__ = "training_videos"

    id          = Column(Integer, primary_key=True, index=True)
    epi_type_id = Column(Integer, ForeignKey("epi_types.id"), nullable=False)
    titulo      = Column(String(200), nullable=False)
    url         = Column(String(500), nullable=False)
    descricao   = Column(Text, nullable=True)
    fonte       = Column(String(150), nullable=True)
    aprovado    = Column(Boolean, default=True, nullable=False)
    prioridade  = Column(Integer, default=0, nullable=False)
    criado_em   = Column(DateTime, server_default=func.now(), nullable=False)

    epi_type = relationship("EpiType", back_populates="videos")
