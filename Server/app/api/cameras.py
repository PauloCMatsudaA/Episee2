import asyncio
import os
from datetime import datetime
from typing import List
from sqlalchemy.orm import joinedload

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import shutil
from pathlib import Path
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_manager
from app.models.user import User
from app.models.camera import Camera
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse, DetectionControl
from app.services.detection_service_real import (
    iniciar_hls,
    parar_hls,
    tarefas_deteccao,
    processar_stream_camera,
)

router = APIRouter(prefix="/cameras", tags=["Cameras"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "best.pt")

@router.get("/", response_model=List[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(
        select(Camera)
        .options(joinedload(Camera.sector))
        .order_by(Camera.name)
    )
    cameras = result.unique().scalars().all()
    return [CameraResponse.model_validate(c) for c in cameras]

@router.post("/", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera_in: CameraCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    camera = Camera(
        name=camera_in.name,
        sector_id=camera_in.sector_id,
        rtsp_url=camera_in.rtsp_url,
        location=camera_in.location if hasattr(camera_in, "location") else None,
        is_active=camera_in.is_active,
    )
    db.add(camera)
    await db.flush()
    await db.commit()

    result = await db.execute(
        select(Camera)
        .options(joinedload(Camera.sector))
        .where(Camera.id == camera.id)
    )
    camera = result.unique().scalar_one()
    return CameraResponse.model_validate(camera)

@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: int,
    camera_in: CameraUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câmera não encontrada")

    for field, value in camera_in.model_dump(exclude_unset=True).items():
        setattr(camera, field, value)

    await db.flush()
    await db.commit()

    result = await db.execute(
        select(Camera)
        .options(joinedload(Camera.sector))
        .where(Camera.id == camera.id)
    )
    camera = result.unique().scalar_one()
    return CameraResponse.model_validate(camera)

HLS_DIR = Path("hls")  

@router.delete("/{camera_id}", status_code=204)
async def delete_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(404, "Câmera não encontrada")
    await db.delete(camera)
    await db.commit()

    pasta_hls = HLS_DIR / str(camera_id)
    if pasta_hls.exists():
        shutil.rmtree(pasta_hls, ignore_errors=True)

@router.post("/{camera_id}/start-detection", response_model=DetectionControl)
async def start_detection(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câmera não encontrada")

    if not camera.rtsp_url:
        raise HTTPException(status_code=400, detail="Câmera sem URL RTSP configurada.")

    iniciar_hls(camera_id, camera.rtsp_url)

    modelo_existe = os.path.exists(MODEL_PATH)
    deteccao_ativa = camera_id in tarefas_deteccao and not tarefas_deteccao[camera_id].done()

    if modelo_existe and not deteccao_ativa:
        sector_id = camera.sector_id or 1
        task = asyncio.create_task(
            processar_stream_camera(camera_id, camera.rtsp_url, sector_id)
        )
        tarefas_deteccao[camera_id] = task
        mensagem = f"Stream HLS e detecção YOLOv8 iniciados para câmera {camera_id}."
    elif not modelo_existe:
        mensagem = (
            f"Stream HLS iniciado. "
            f"Detecção não iniciada: best.pt não encontrado em '{MODEL_PATH}'. "
            "Coloque o modelo treinado em Server/best.pt e clique novamente."
        )
    else:
        mensagem = f"Stream HLS e detecção já estão ativos para câmera {camera_id}."

    camera.last_seen = datetime.utcnow()
    await db.flush()
    await db.commit()

    return DetectionControl(
        camera_id=camera_id,
        action="start",
        message=mensagem,
    )

@router.post("/{camera_id}/stop-detection", response_model=DetectionControl)
async def stop_detection(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câmera não encontrada")

    parar_hls(camera_id)

    return DetectionControl(
        camera_id=camera_id,
        action="stop",
        message=f"Stream HLS e detecção encerrados para câmera {camera_id}.",
    )
