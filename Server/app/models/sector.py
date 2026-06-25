from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Sector(Base):
    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    epis_obrigatorios = Column(JSON, nullable=True, default=list, server_default="[]")
    
    users = relationship("User", back_populates="sector", lazy="selectin")
    cameras = relationship("Camera", back_populates="sector", lazy="select")

    occurrences = relationship("Occurrence", back_populates="sector", lazy="selectin")
    epi_requests = relationship("EPIRequest", back_populates="sector", lazy="selectin")
