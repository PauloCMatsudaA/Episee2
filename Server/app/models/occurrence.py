import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base
from datetime import datetime
from app.models.camera import Camera

class OccurrenceStatus(str, enum.Enum):
    conforme = "conforme"
    nao_conforme = "nao_conforme"

class Occurrence(Base):
    __tablename__ = "occurrences"

    id           = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    sector_id    = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    timestamp    = Column(DateTime, server_default=func.now(), nullable=False)
    status       = Column(Enum(OccurrenceStatus), nullable=False, default=OccurrenceStatus.conforme)
    epi_detected = Column(JSON, nullable=False, default=list)
    confidence   = Column(Float, nullable=True)
    image_path   = Column(String(500), nullable=True)
    created_at = Column(
    DateTime,
    default=datetime.utcnow,   
    server_default=func.now(),     
    nullable=False
)

    camera = relationship("Camera", back_populates="occurrences")
    sector = relationship("Sector", back_populates="occurrences")
