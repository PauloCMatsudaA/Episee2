from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_manager, get_current_user
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = None,
    sector_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    query = select(User).options(selectinload(User.sector))
    if role:
        query = query.where(User.role == role)
    if sector_id:
        query = query.where(User.sector_id == sector_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return [UserResponse.model_validate(u) for u in result.scalars().all()]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "gestor" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    result = await db.execute(
        select(User).options(selectinload(User.sector)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    return UserResponse.model_validate(user)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    email_lower = user_in.email.strip().lower()

    result = await db.execute(
        select(User).where(func.lower(User.email) == email_lower)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )

    user = User(
        name=user_in.name,
        email=email_lower,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        sector_id=user_in.sector_id,
        phone=user_in.phone,
    )
    db.add(user)
    await db.flush()
    
    result = await db.execute(
        select(User).options(selectinload(User.sector)).where(User.id == user.id)
    )
    user = result.scalar_one()
    return UserResponse.model_validate(user)

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "gestor" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    result = await db.execute(
        select(User).options(selectinload(User.sector)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    if "email" in update_data:
        update_data["email"] = update_data["email"].strip().lower()

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    
    result = await db.execute(
        select(User).options(selectinload(User.sector)).where(User.id == user_id)
    )
    user = result.scalar_one()
    return UserResponse.model_validate(user)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    if user.is_system_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O administrador padrão do sistema não pode ser excluído.",
        )

    await db.delete(user)
