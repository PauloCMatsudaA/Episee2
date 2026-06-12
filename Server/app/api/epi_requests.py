from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_manager
from app.models.user import User
from app.models.epi_request import EPIRequest, EPIRequestStatus
from app.schemas.epi_request import (
    EPIRequestCreate,
    EPIRequestResponse,
    EPIRequestApproveReject,
)

router = APIRouter(prefix="/epi-requests", tags=["EPI Requests"])


@router.get("/my", response_model=List[EPIRequestResponse])
async def get_my_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return EPI requests made by the current user."""
    result = await db.execute(
        select(EPIRequest).where(EPIRequest.worker_id == current_user.id)
        .order_by(EPIRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return [EPIRequestResponse.model_validate(r) for r in requests]


@router.get("/", response_model=List[EPIRequestResponse])
async def list_epi_requests(
    status: Optional[EPIRequestStatus] = None,
    sector_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List EPI requests. Managers see all; workers see only their own."""
    query = select(EPIRequest)

    if current_user.role == "trabalhador":
        query = query.where(EPIRequest.worker_id == current_user.id)
    else:
        if sector_id:
            query = query.where(EPIRequest.sector_id == sector_id)

    if status:
        query = query.where(EPIRequest.status == status)

    query = query.order_by(EPIRequest.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    requests = result.scalars().all()
    return [EPIRequestResponse.model_validate(r) for r in requests]


@router.post("/", response_model=EPIRequestResponse, status_code=status.HTTP_201_CREATED)
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
    await db.refresh(epi_request)
    return EPIRequestResponse.model_validate(epi_request)


@router.patch("/{request_id}/approve", response_model=EPIRequestResponse)
async def approve_epi_request(
    request_id: int,
    body: EPIRequestApproveReject = EPIRequestApproveReject(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    """Manager approves an EPI request."""
    result = await db.execute(select(EPIRequest).where(EPIRequest.id == request_id))
    epi_request = result.scalar_one_or_none()
    if not epi_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    if epi_request.status != EPIRequestStatus.pendente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas solicitações pendentes podem ser aprovadas",
        )

    epi_request.status = EPIRequestStatus.aprovada
    epi_request.manager_id = current_user.id
    epi_request.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(epi_request)
    return EPIRequestResponse.model_validate(epi_request)


@router.patch("/{request_id}/reject", response_model=EPIRequestResponse)
async def reject_epi_request(
    request_id: int,
    body: EPIRequestApproveReject = EPIRequestApproveReject(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    """Manager rejects an EPI request."""
    result = await db.execute(select(EPIRequest).where(EPIRequest.id == request_id))
    epi_request = result.scalar_one_or_none()
    if not epi_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    if epi_request.status != EPIRequestStatus.pendente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas solicitações pendentes podem ser rejeitadas",
        )

    epi_request.status = EPIRequestStatus.rejeitada
    epi_request.manager_id = current_user.id
    epi_request.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(epi_request)
    return EPIRequestResponse.model_validate(epi_request)
