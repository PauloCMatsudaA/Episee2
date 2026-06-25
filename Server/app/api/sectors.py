from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from collections import Counter

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_manager
from app.models.user import User
from app.models.sector import Sector
from app.models.occurrence import Occurrence, OccurrenceStatus
from app.schemas.sector import SectorCreate, SectorUpdate, SectorResponse, SectorStats

router = APIRouter(prefix="/sectors", tags=["Sectors"])

@router.get("", response_model=List[SectorResponse])
@router.get("/", response_model=List[SectorResponse], include_in_schema=False)
async def list_sectors(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Sector).order_by(Sector.name))
    sectors = result.scalars().all()
    return [SectorResponse.model_validate(s) for s in sectors]

@router.get("/{sector_id}", response_model=SectorResponse)
async def get_sector(
    sector_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado")
    return SectorResponse.model_validate(sector)

@router.get("/{sector_id}/stats", response_model=SectorStats)
async def get_sector_stats(
    sector_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=404, detail="Setor não encontrado")

    occ_result = await db.execute(
        select(Occurrence).where(Occurrence.sector_id == sector_id)
    )
    ocorrencias = occ_result.scalars().all()

    conformes     = sum(1 for o in ocorrencias if o.status == OccurrenceStatus.conforme)
    nao_conformes = sum(1 for o in ocorrencias if o.status == OccurrenceStatus.nao_conforme)
    total         = len(ocorrencias)
    taxa          = round(conformes / total, 4) if total > 0 else 0.0

    ausencias: list[str] = []
    for o in ocorrencias:
        epis_det = o.epi_detected or []
        obrigatorios = sector.epis_obrigatorios or []
        ausentes = [e for e in obrigatorios if e not in epis_det]
        ausencias.extend(ausentes)

    contador = Counter(ausencias)
    epis_mais_ausentes = [
        {"epi": epi, "ausencias": qtd}
        for epi, qtd in contador.most_common()
    ]

    return SectorStats(
        sector_id=sector.id,
        sector_name=sector.name,
        epis_obrigatorios=sector.epis_obrigatorios or [],
        total_ocorrencias=total,
        conformes=conformes,
        nao_conformes=nao_conformes,
        taxa_conformidade=taxa,
        epis_mais_ausentes=epis_mais_ausentes,
    )

@router.post("", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SectorResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_sector(
    sector_in: SectorCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    
    result = await db.execute(select(Sector).where(Sector.name == sector_in.name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setor com este nome já existe",
        )

    sector = Sector(
        name=sector_in.name,
        description=sector_in.description,
        epis_obrigatorios=sector_in.epis_obrigatorios or [],
    )
    db.add(sector)
    await db.flush()
    await db.refresh(sector)
    return SectorResponse.model_validate(sector)

@router.patch("/{sector_id}", response_model=SectorResponse)
async def update_sector(
    sector_id: int,
    sector_in: SectorUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado")

    for field, value in sector_in.model_dump(exclude_unset=True).items():
        setattr(sector, field, value)

    await db.flush()
    await db.refresh(sector)
    return SectorResponse.model_validate(sector)

@router.delete("/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sector(
    sector_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado")
    await db.delete(sector)
    await db.flush()
