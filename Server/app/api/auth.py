from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    verify_password,
    get_password_hash,
)
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    email_lower = form_data.username.strip().lower()
    result = await db.execute(
        select(User)
        .options(selectinload(User.sector))
        .where(func.lower(User.email) == email_lower)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    email_lower = user_in.email.strip().lower()
    result = await db.execute(
        select(User).where(func.lower(User.email) == email_lower)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email j\u00e1 cadastrado",
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

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.sector))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return UserResponse.model_validate(user)
