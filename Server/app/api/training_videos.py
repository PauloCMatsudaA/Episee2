import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.training_video import EpiType, TrainingVideo
from app.models.user import User, UserRole
from app.schemas.training_video import (
    EpiTypeCreate, EpiTypeResponse, EpiTypeUpdate,
    TrainingVideoCreate, TrainingVideoResponse, TrainingVideoUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/training", tags=["training"])


def _somente_gestor(usuario: User):
    if usuario.role != UserRole.gestor:
        raise HTTPException(status_code=403, detail="Apenas gestores podem realizar esta ação.")


# ── EpiType CRUD ──────────────────────────────────────────────────────────────

@router.get("/epi-types", response_model=List[EpiTypeResponse])
async def listar_epi_types(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(EpiType).order_by(EpiType.nome))
    return result.scalars().all()


@router.get("/epi-types/{epi_id}", response_model=EpiTypeResponse)
async def buscar_epi_type(
    epi_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    epi = await db.get(EpiType, epi_id)
    if not epi:
        raise HTTPException(status_code=404, detail="Tipo de EPI não encontrado.")
    return epi


@router.post("/epi-types", response_model=EpiTypeResponse, status_code=201)
async def criar_epi_type(
    payload: EpiTypeCreate,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    _somente_gestor(usuario)
    epi = EpiType(**payload.model_dump())
    db.add(epi)
    await db.commit()
    await db.refresh(epi)
    return epi


@router.patch("/epi-types/{epi_id}", response_model=EpiTypeResponse)
async def atualizar_epi_type(
    epi_id: int,
    payload: EpiTypeUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    _somente_gestor(usuario)
    epi = await db.get(EpiType, epi_id)
    if not epi:
        raise HTTPException(status_code=404, detail="Tipo de EPI não encontrado.")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(epi, campo, valor)
    await db.commit()
    await db.refresh(epi)
    return epi


@router.delete("/epi-types/{epi_id}", status_code=204)
async def deletar_epi_type(
    epi_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    _somente_gestor(usuario)
    epi = await db.get(EpiType, epi_id)
    if not epi:
        raise HTTPException(status_code=404, detail="Tipo de EPI não encontrado.")
    await db.delete(epi)
    await db.commit()


# ── TrainingVideo CRUD ────────────────────────────────────────────────────────

@router.get("/videos", response_model=List[TrainingVideoResponse])
async def listar_videos(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TrainingVideo)
        .where(TrainingVideo.aprovado == True)
        .order_by(TrainingVideo.prioridade.desc(), TrainingVideo.criado_em.desc())
    )
    return result.scalars().all()


@router.get("/videos/epi/{epi_id}", response_model=List[TrainingVideoResponse])
async def videos_por_epi(
    epi_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TrainingVideo)
        .where(TrainingVideo.epi_type_id == epi_id, TrainingVideo.aprovado == True)
        .order_by(TrainingVideo.prioridade.desc())
    )
    return result.scalars().all()


@router.post("/videos", response_model=TrainingVideoResponse, status_code=201)
async def criar_video(
    payload: TrainingVideoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    _somente_gestor(usuario)
    epi = await db.get(EpiType, payload.epi_type_id)
    if not epi:
        raise HTTPException(status_code=404, detail="Tipo de EPI não encontrado.")
    video = TrainingVideo(**payload.model_dump())
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.patch("/videos/{video_id}", response_model=TrainingVideoResponse)
async def atualizar_video(
    video_id: int,
    payload: TrainingVideoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    _somente_gestor(usuario)
    video = await db.get(TrainingVideo, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado.")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(video, campo, valor)
    await db.commit()
    await db.refresh(video)
    return video


@router.delete("/videos/{video_id}", status_code=204)
async def deletar_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    _somente_gestor(usuario)
    video = await db.get(TrainingVideo, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado.")
    await db.delete(video)
    await db.commit()
