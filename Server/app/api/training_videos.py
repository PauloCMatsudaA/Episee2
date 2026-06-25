import os
import uuid
import aiofiles
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
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

router = APIRouter(prefix="/training", tags=["training"])

UPLOAD_DIR = Path("uploads") / "training_videos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MIME_PERMITIDOS = {
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
}

TAMANHO_MAXIMO = 500 * 1024 * 1024  

def _exige_gestor(user: User):
    if getattr(user, 'role', None) not in ('admin', 'manager', 'gestor'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Apenas gestores podem realizar esta ação.")

@router.get("/worker/epis", response_model=List[EpiTypeOut])
async def listar_epis_worker(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    
    result = await db.execute(
        select(EpiType).options(selectinload(EpiType.videos))
    )
    epis = result.scalars().all()
    return [e for e in epis if any(v.aprovado for v in e.videos)]

@router.get("/epis", response_model=List[EpiTypeOut])
async def listar_epis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EpiType).options(selectinload(EpiType.videos))
    )
    return result.scalars().all()

@router.get("/epi-types", response_model=List[EpiTypeOut])
async def listar_epis_alias(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EpiType).options(selectinload(EpiType.videos))
    )
    return result.scalars().all()

@router.post("/epi-types", response_model=EpiTypeOut, status_code=status.HTTP_201_CREATED)
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

@router.patch("/epi-types/{epi_id}", response_model=EpiTypeOut)
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

@router.delete("/epi-types/{epi_id}", status_code=status.HTTP_204_NO_CONTENT)
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

@router.post("/videos", response_model=TrainingVideoOut, status_code=status.HTTP_201_CREATED)
async def adicionar_video(
    dados: TrainingVideoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    result = await db.execute(select(EpiType).where(EpiType.id == dados.epi_type_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="EPI não encontrado.")
    video = TrainingVideo(**dados.model_dump())
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video

@router.post("/epis/{epi_id}/videos", response_model=TrainingVideoOut,
             status_code=status.HTTP_201_CREATED)
async def adicionar_video_por_epi(
    epi_id: int,
    dados: TrainingVideoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _exige_gestor(current_user)
    result = await db.execute(select(EpiType).where(EpiType.id == epi_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="EPI não encontrado.")
    
    dados_dict = dados.model_dump(exclude={"epi_type_id"})
    video = TrainingVideo(epi_type_id=epi_id, **dados_dict)
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video

@router.post("/videos/upload", response_model=TrainingVideoOut,
             status_code=status.HTTP_201_CREATED)
async def upload_video(
    epi_type_id: int        = Form(...),
    titulo:      str        = Form(...),
    descricao:   str        = Form(''),
    fonte:       str        = Form(''),
    aprovado:    bool       = Form(True),
    prioridade:  int        = Form(0),
    file:        UploadFile = File(...),
    db:          AsyncSession = Depends(get_db),
    current_user: User     = Depends(get_current_user),
):
    
    _exige_gestor(current_user)

    result = await db.execute(select(EpiType).where(EpiType.id == epi_type_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="EPI não encontrado.")

    if file.content_type not in MIME_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de arquivo não suportado: {file.content_type}. "
                   f"Use MP4, WebM, OGG, MOV ou AVI."
        )

    extensao = Path(file.filename or "video.mp4").suffix or ".mp4"
    nome_arquivo = f"{uuid.uuid4().hex}{extensao}"
    destino = UPLOAD_DIR / nome_arquivo

    tamanho = 0
    async with aiofiles.open(destino, "wb") as f_out:
        while chunk := await file.read(1024 * 1024):  
            tamanho += len(chunk)
            if tamanho > TAMANHO_MAXIMO:
                await f_out.close()
                destino.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Arquivo excede o limite de 500 MB."
                )
            await f_out.write(chunk)

    url_video = f"/api/training/videos/file/{nome_arquivo}"

    video = TrainingVideo(
        epi_type_id=epi_type_id,
        titulo=titulo,
        url=url_video,
        descricao=descricao,
        fonte=fonte,
        aprovado=aprovado,
        prioridade=prioridade,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video

@router.get("/videos/file/{nome_arquivo}")
async def servir_video(
    nome_arquivo: str,
    current_user: User = Depends(get_current_user),
):
    
    caminho = UPLOAD_DIR / nome_arquivo
    if not caminho.exists() or not caminho.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    
    if not str(caminho.resolve()).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Caminho inválido.")
    return FileResponse(str(caminho), media_type="video/mp4")

@router.patch("/videos/{video_id}", response_model=TrainingVideoOut)
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

    if video.url and video.url.startswith("/api/training/videos/file/"):
        nome = video.url.split("/")[-1]
        arquivo = UPLOAD_DIR / nome
        if arquivo.exists():
            arquivo.unlink(missing_ok=True)

    await db.delete(video)
    await db.commit()
