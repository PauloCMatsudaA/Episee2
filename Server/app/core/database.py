from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings


def _build_async_url(url: str) -> str:
    """
    Garante que a DATABASE_URL use driver async correto:
    - postgresql://   -> postgresql+asyncpg://
    - postgres://     -> postgresql+asyncpg://  (formato Heroku/Railway)
    - sqlite:///      -> sqlite+aiosqlite:///
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+" not in url.split("://")[0]:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite:///") and "+" not in url.split("://")[0]:
        url = url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return url


_async_url = _build_async_url(settings.DATABASE_URL)

engine = create_async_engine(
    _async_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency que fornece uma sessao async do banco."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Cria todas as tabelas no banco (usado em dev/SQLite)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
