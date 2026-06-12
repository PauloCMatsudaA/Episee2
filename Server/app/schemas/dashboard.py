from typing import List, Optional
from pydantic import BaseModel


class OccurrenceBySector(BaseModel):
    sector_id: int
    sector_name: str
    total: int
    non_compliant: int
    compliance_rate: float


class ComplianceTrendItem(BaseModel):
    date: str  # ISO date string YYYY-MM-DD
    rate: float
    total: int
    non_compliant: int


class DashboardStats(BaseModel):
    total_occurrences: int
    compliance_rate: float
    non_compliant_today: int
    pending_requests: int
    cameras_active: int
    occurrences_by_sector: List[OccurrenceBySector]
    compliance_trend: List[ComplianceTrendItem]
