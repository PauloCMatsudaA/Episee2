from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.occurrence import Occurrence, OccurrenceStatus
from app.models.camera import Camera
from app.models.sector import Sector
from app.schemas.occurrence import (
    OccurrenceCreate,
    OccurrenceResponse,
    OccurrenceSummary,
)

router = APIRouter(prefix="/occurrences", tags=["Occurrences"])

@router.get("/", response_model=List[OccurrenceResponse])
async def list_occurrences(
    sector_id: Optional[int] = None,
    status: Optional[OccurrenceStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    
    conditions = []

    if sector_id:
        conditions.append(Occurrence.sector_id == sector_id)
    if status:
        conditions.append(Occurrence.status == status)
    if start_date:
        conditions.append(Occurrence.timestamp >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        conditions.append(Occurrence.timestamp <= datetime.combine(end_date, datetime.max.time()))

    if current_user.role == "trabalhador" and current_user.sector_id:
        conditions.append(Occurrence.sector_id == current_user.sector_id)

    query = (
        select(Occurrence).options(
        selectinload(Occurrence.camera),selectinload(Occurrence.sector),)
        .offset(skip)
        .limit(limit)
        .order_by(Occurrence.timestamp.desc())
    )
    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    occurrences = result.scalars().all()

    responses = []
    for o in occurrences:
        data = OccurrenceResponse.model_validate(o)
        
        data.camera_name = o.camera.name if o.camera else f"Camera {o.camera_id}"
        data.sector_name = o.sector.name if o.sector else f"Setor {o.sector_id}"
        responses.append(data)

    return responses

@router.get("/stats/summary", response_model=OccurrenceSummary)
async def get_occurrence_summary(
    sector_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    
    query = select(Occurrence)
    if sector_id:
        query = query.where(Occurrence.sector_id == sector_id)

    result = await db.execute(query)
    occurrences = result.scalars().all()

    total = len(occurrences)
    conforme_count = sum(1 for o in occurrences if o.status == OccurrenceStatus.conforme)
    nao_conforme_count = total - conforme_count

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_non_compliant = sum(
        1
        for o in occurrences
        if o.status == OccurrenceStatus.nao_conforme and o.timestamp >= today_start
    )

    compliance_rate = round((conforme_count / total * 100), 2) if total > 0 else 100.0

    return OccurrenceSummary(
        total=total,
        conforme=conforme_count,
        nao_conforme=nao_conforme_count,
        compliance_rate=compliance_rate,
        today_non_compliant=today_non_compliant,
    )

@router.get("/{occurrence_id}", response_model=OccurrenceResponse)
async def get_occurrence(
    occurrence_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    
    result = await db.execute(select(Occurrence).where(Occurrence.id == occurrence_id))
    occurrence = result.scalar_one_or_none()
    if not occurrence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ocorrência não encontrada")

    data = OccurrenceResponse.model_validate(occurrence)
    data.camera_name = occurrence.camera.name if occurrence.camera else f"Camera {occurrence.camera_id}"
    data.sector_name = occurrence.sector.name if occurrence.sector else f"Setor {occurrence.sector_id}"
    return data

@router.post("/", response_model=OccurrenceResponse, status_code=status.HTTP_201_CREATED)
async def create_occurrence(
    occurrence_in: OccurrenceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    
    occurrence = Occurrence(
        camera_id=occurrence_in.camera_id,
        sector_id=occurrence_in.sector_id,
        timestamp=occurrence_in.timestamp or datetime.utcnow(),
        status=occurrence_in.status,
        epi_detected=occurrence_in.epi_detected,
        confidence=occurrence_in.confidence,
        image_path=occurrence_in.image_path,
    )
    db.add(occurrence)
    await db.flush()
    await db.refresh(occurrence)

    data = OccurrenceResponse.model_validate(occurrence)
    data.camera_name = occurrence.camera.name if occurrence.camera else f"Camera {occurrence.camera_id}"
    data.sector_name = occurrence.sector.name if occurrence.sector else f"Setor {occurrence.sector_id}"
    return data
