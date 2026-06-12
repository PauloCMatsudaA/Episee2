from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class EpiType(Base):
    """Tipos de EPI cadastrados pelo gestor."""
    __tablename__ = "epi_types"

    id          = Column(Integer, primary_key=True, index=True)
    nome        = Column(String(100), nullable=False, unique=True)  # ex: "Capacete"
    descricao   = Column(Text, nullable=True)
    quando_usar = Column(Text, nullable=True)   # ocasiões de uso
    como_usar   = Column(Text, nullable=True)   # passo a passo de uso correto
    erros_comuns = Column(Text, nullable=True)  # erros frequentes
    nr6_ref     = Column(String(100), nullable=True)  # ex: "NR-6 item 6.3"
    criado_em   = Column(DateTime, server_default=func.now(), nullable=False)

    videos = relationship(
        "TrainingVideo",
        back_populates="epi_type",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class TrainingVideo(Base):
    """Vídeos educativos vinculados a um tipo de EPI."""
    __tablename__ = "training_videos"

    id          = Column(Integer, primary_key=True, index=True)
    epi_type_id = Column(Integer, ForeignKey("epi_types.id"), nullable=False)
    titulo      = Column(String(200), nullable=False)
    url         = Column(String(500), nullable=False)   # YouTube ou link direto
    descricao   = Column(Text, nullable=True)
    fonte       = Column(String(150), nullable=True)    # ex: "SENAI", "Ministério do Trabalho"
    aprovado    = Column(Boolean, default=True, nullable=False)  # curadoria do gestor
    prioridade  = Column(Integer, default=0, nullable=False)     # ordena exibição
    criado_em   = Column(DateTime, server_default=func.now(), nullable=False)

    epi_type = relationship("EpiType", back_populates="videos")
