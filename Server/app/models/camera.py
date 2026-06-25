from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from sqlalchemy.orm import relationship

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)          
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=True)  
    rtsp_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sector = relationship("Sector", back_populates="cameras", lazy="select")
    occurrences = relationship("Occurrence", back_populates="camera", lazy="selectin")
