from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_manager
from app.models.user import User
from app.models.epi_request import EPIRequest, EPIRequestStatus
from app.schemas.epi_request import (
    EPIRequestCreate,
    EPIRequestResponse,
    EPIRequestApproveReject,
    EPIRequestEntrega,
)

router = APIRouter(prefix="/epi-requests", tags=["EPI Requests"])

def _to_response(r: EPIRequest) -> EPIRequestResponse:
    
    data = EPIRequestResponse.model_validate(r)
    if r.worker:
        data.worker_name = r.worker.name or r.worker.email
    if r.sector:
        data.sector_name = r.sector.name
    return data

@router.get("/my", response_model=List[EPIRequestResponse])
async def get_my_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.worker_id == current_user.id)
        .order_by(EPIRequest.created_at.desc())
    )
    return [_to_response(r) for r in result.scalars().all()]

@router.get("", response_model=List[EPIRequestResponse])
@router.get("/", response_model=List[EPIRequestResponse], include_in_schema=False)
async def list_epi_requests(
    status: Optional[EPIRequestStatus] = None,
    sector_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(EPIRequest).options(
        selectinload(EPIRequest.worker),
        selectinload(EPIRequest.sector),
    )
    if current_user.role == "trabalhador":
        query = query.where(EPIRequest.worker_id == current_user.id)
    else:
        if sector_id:
            query = query.where(EPIRequest.sector_id == sector_id)
    if status:
        query = query.where(EPIRequest.status == status)
    query = query.order_by(EPIRequest.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return [_to_response(r) for r in result.scalars().all()]

@router.post("", response_model=EPIRequestResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=EPIRequestResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_epi_request(
    request_in: EPIRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    epi_request = EPIRequest(
        worker_id=current_user.id,
        sector_id=request_in.sector_id,
        epi_type=request_in.epi_type,
        reason=request_in.reason,
        status=EPIRequestStatus.pendente,
    )
    db.add(epi_request)
    await db.flush()
    result = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.id == epi_request.id)
    )
    return _to_response(result.scalar_one())

@router.patch("/{request_id}/approve", response_model=EPIRequestResponse)
async def approve_epi_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    result = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.id == request_id)
    )
    epi_request = result.scalar_one_or_none()
    if not epi_request:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada")
    if epi_request.status != EPIRequestStatus.pendente:
        raise HTTPException(status_code=400, detail="Apenas solicitacoes pendentes podem ser aprovadas")

    epi_request.status = EPIRequestStatus.aprovada
    epi_request.manager_id = current_user.id
    epi_request.motivo_rejeicao = None
    epi_request.updated_at = datetime.utcnow()
    await db.flush()
    result2 = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.id == request_id)
    )
    return _to_response(result2.scalar_one())

@router.patch("/{request_id}/reject", response_model=EPIRequestResponse)
async def reject_epi_request(
    request_id: int,
    body: EPIRequestApproveReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    if not body.motivo_rejeicao or not body.motivo_rejeicao.strip():
        raise HTTPException(status_code=400, detail="E obrigatorio informar o motivo da rejeicao.")

    result = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.id == request_id)
    )
    epi_request = result.scalar_one_or_none()
    if not epi_request:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada")
    if epi_request.status != EPIRequestStatus.pendente:
        raise HTTPException(status_code=400, detail="Apenas solicitacoes pendentes podem ser rejeitadas")

    epi_request.status = EPIRequestStatus.rejeitada
    epi_request.manager_id = current_user.id
    epi_request.motivo_rejeicao = body.motivo_rejeicao.strip()
    epi_request.updated_at = datetime.utcnow()
    await db.flush()
    result2 = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.id == request_id)
    )
    return _to_response(result2.scalar_one())

@router.patch("/{request_id}/entrega", response_model=EPIRequestResponse)
async def marcar_entrega(
    request_id: int,
    body: EPIRequestEntrega,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    result = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.id == request_id)
    )
    epi_request = result.scalar_one_or_none()
    if not epi_request:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada")
    if epi_request.status != EPIRequestStatus.aprovada:
        raise HTTPException(status_code=400, detail="So e possivel marcar entrega em solicitacoes aprovadas")

    epi_request.entregue = body.entregue
    epi_request.updated_at = datetime.utcnow()
    await db.flush()
    result2 = await db.execute(
        select(EPIRequest)
        .options(selectinload(EPIRequest.worker), selectinload(EPIRequest.sector))
        .where(EPIRequest.id == request_id)
    )
    return _to_response(result2.scalar_one())
