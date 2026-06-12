from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.training_video import EpiType, TrainingVideo
from app.models.user import User
from app.schemas.training_video import (
    EpiTypeCreate, EpiTypeUpdate, EpiTypeOut,
    TrainingVideoCreate, TrainingVideoUpdate, TrainingVideoOut,
)

# prefix apenas "/training" — o main.py já adiciona "/api"
router = APIRouter(prefix="/training", tags=["training"])


def _exige_gestor(user: User):
    if getattr(user, 'role', None) not in ('admin', 'manager', 'gestor'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Apenas gestores podem realizar esta ação.")


# ─────────────────────────────────────────────────────────────
# ROTA PÚBLICA PARA TRABALHADORES
# Retorna EPIs que possuem pelo menos um vídeo aprovado
# ─────────────────────────────────────────────────────────────

@router.get("/worker/epis", response_model=List[EpiTypeOut])
async def listar_epis_worker(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Lista EPIs com vídeos aprovados. Acessível a qualquer usuário autenticado."""
    result = await db.execute(
        select(EpiType).options(selectinload(EpiType.videos))
    )
    epis = result.scalars().all()
    epis_com_videos = [e for e in epis if any(v.aprovado for v in e.videos)]
    return epis_com_videos


# ─────────────────────────────────────────────────────────────
# CRUD DE EPI (somente gestor)
# ─────────────────────────────────────────────────────────────

@router.get("/epis", response_model=List[EpiTypeOut])
async def listar_epis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EpiType).options(selectinload(EpiType.videos))
    )
    return result.scalars().all()


# Alias para compatibilidade com o frontend que chama /epi-types
@router.get("/epi-types", response_model=List[EpiTypeOut])
async def listar_epis_alias(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EpiType).options(selectinload(EpiType.videos))
    )
    return result.scalars().all()


@router.post("/epis", response_model=EpiTypeOut, status_code=status.HTTP_201_CREATED)
async def criar_epi(
    dados: EpiTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    epi = EpiType(**dados.model_dump())
    db.add(epi)
    await db.commit()
    await db.refresh(epi)
    return epi


@router.put("/epis/{epi_id}", response_model=EpiTypeOut)
async def atualizar_epi(
    epi_id: int,
    dados: EpiTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    result = await db.execute(
        select(EpiType).where(EpiType.id == epi_id).options(selectinload(EpiType.videos))
    )
    epi = result.scalar_one_or_none()
    if not epi:
        raise HTTPException(status_code=404, detail="EPI não encontrado.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(epi, campo, valor)
    await db.commit()
    await db.refresh(epi)
    return epi


@router.delete("/epis/{epi_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_epi(
    epi_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    result = await db.execute(select(EpiType).where(EpiType.id == epi_id))
    epi = result.scalar_one_or_none()
    if not epi:
        raise HTTPException(status_code=404, detail="EPI não encontrado.")
    await db.delete(epi)
    await db.commit()


# ─────────────────────────────────────────────────────────────
# CRUD DE VÍDEOS (somente gestor)
# ─────────────────────────────────────────────────────────────

@router.post("/epis/{epi_id}/videos", response_model=TrainingVideoOut,
             status_code=status.HTTP_201_CREATED)
async def adicionar_video(
    epi_id: int,
    dados: TrainingVideoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    result = await db.execute(select(EpiType).where(EpiType.id == epi_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="EPI não encontrado.")
    video = TrainingVideo(epi_type_id=epi_id, **dados.model_dump())
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.put("/videos/{video_id}", response_model=TrainingVideoOut)
async def atualizar_video(
    video_id: int,
    dados: TrainingVideoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    result = await db.execute(select(TrainingVideo).where(TrainingVideo.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(video, campo, valor)
    await db.commit()
    await db.refresh(video)
    return video


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    result = await db.execute(select(TrainingVideo).where(TrainingVideo.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado.")
    await db.delete(video)
    await db.commit()
