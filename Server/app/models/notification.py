from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tipo      = Column(String(20), nullable=False, default="info")
    texto     = Column(Text, nullable=False)
    lida      = Column(Boolean, default=False, nullable=False)
    criado_em = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="notifications")