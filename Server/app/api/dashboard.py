from datetime import datetime, timedelta
from typing import List
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.occurrence import Occurrence, OccurrenceStatus
from app.models.epi_request import EPIRequest, EPIRequestStatus
from app.models.camera import Camera
from app.models.sector import Sector
from app.schemas.dashboard import (
    DashboardStats,
    OccurrenceBySector,
    ComplianceTrendItem,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Return aggregated dashboard statistics calculated from real database data.
    Includes total occurrences, compliance rate, pending requests,
    active cameras, per-sector breakdown, and 30-day compliance trend.
    """
    # --- Load all data ---
    occurrences_result = await db.execute(select(Occurrence))
    occurrences: List[Occurrence] = occurrences_result.scalars().all()

    requests_result = await db.execute(
        select(EPIRequest).where(EPIRequest.status == EPIRequestStatus.pendente)
    )
    pending_requests = len(requests_result.scalars().all())

    cameras_result = await db.execute(
        select(Camera).where(Camera.is_active == True)
    )
    cameras_active = len(cameras_result.scalars().all())

    sectors_result = await db.execute(select(Sector))
    sectors: List[Sector] = sectors_result.scalars().all()
    sector_map = {s.id: s.name for s in sectors}

    # --- Aggregates ---
    total = len(occurrences)
    conforme_count = sum(1 for o in occurrences if o.status == OccurrenceStatus.conforme)
    compliance_rate = round((conforme_count / total * 100), 2) if total > 0 else 100.0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    non_compliant_today = sum(
        1
        for o in occurrences
        if o.status == OccurrenceStatus.nao_conforme and o.timestamp >= today_start
    )

    # --- Per sector breakdown ---
    sector_totals: dict = defaultdict(lambda: {"total": 0, "non_compliant": 0})
    for o in occurrences:
        sector_totals[o.sector_id]["total"] += 1
        if o.status == OccurrenceStatus.nao_conforme:
            sector_totals[o.sector_id]["non_compliant"] += 1

    occurrences_by_sector: List[OccurrenceBySector] = []
    for sector_id, counts in sector_totals.items():
        sec_total = counts["total"]
        sec_nc = counts["non_compliant"]
        sec_rate = round(((sec_total - sec_nc) / sec_total * 100), 2) if sec_total > 0 else 100.0
        occurrences_by_sector.append(
            OccurrenceBySector(
                sector_id=sector_id,
                sector_name=sector_map.get(sector_id, f"Setor {sector_id}"),
                total=sec_total,
                non_compliant=sec_nc,
                compliance_rate=sec_rate,
            )
        )

    # --- 30-day compliance trend ---
    compliance_trend: List[ComplianceTrendItem] = []
    now = datetime.utcnow()
    for days_ago in range(29, -1, -1):
        day_start = (now - timedelta(days=days_ago)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timedelta(days=1)

        day_occurrences = [
            o for o in occurrences if day_start <= o.timestamp < day_end
        ]
        day_total = len(day_occurrences)
        day_nc = sum(1 for o in day_occurrences if o.status == OccurrenceStatus.nao_conforme)
        day_rate = round(((day_total - day_nc) / day_total * 100), 2) if day_total > 0 else 100.0

        compliance_trend.append(
            ComplianceTrendItem(
                date=day_start.date().isoformat(),
                rate=day_rate,
                total=day_total,
                non_compliant=day_nc,
            )
        )

    return DashboardStats(
        total_occurrences=total,
        compliance_rate=compliance_rate,
        non_compliant_today=non_compliant_today,
        pending_requests=pending_requests,
        cameras_active=cameras_active,
        occurrences_by_sector=occurrences_by_sector,
        compliance_trend=compliance_trend,
    )
