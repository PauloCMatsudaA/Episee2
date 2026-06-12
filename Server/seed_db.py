"""
seed_db.py — Popula o banco com dados realistas para visualização dos gráficos.
Execute uma vez: python seed_db.py
"""
import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from app.core.database import Base
from app.models.user import User, UserRole
from app.models.sector import Sector
from app.models.camera import Camera
from app.models.occurrence import Occurrence, OccurrenceStatus
from app.models.epi_request import EPIRequest, EPIRequestStatus

DATABASE_URL = "sqlite+aiosqlite:///./episee.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Setores ──────────────────────────────────────────────────────────
        setor_nomes = ["Produção", "Manutenção", "Almoxarifado", "Expedição"]
        setores = [Sector(name=n, description=f"Setor de {n}") for n in setor_nomes]
        db.add_all(setores)
        await db.flush()

        # ── Usuários ─────────────────────────────────────────────────────────
        gestor = User(
            name="Admin EPIsee",
            email="admin@episee.com",
            hashed_password=pwd_context.hash("admin123"),
            role=UserRole.gestor,
            sector_id=setores[0].id,
            phone="42999990000",
            is_active=True,
        )
        db.add(gestor)

        trabalhadores = []
        nomes = ["Carlos Silva", "Ana Souza", "João Lima", "Maria Costa",
                 "Pedro Rocha", "Fernanda Dias", "Lucas Martins", "Juliana Nunes"]
        for i, nome in enumerate(nomes):
            u = User(
                name=nome,
                email=f"trabalhador{i+1}@episee.com",
                hashed_password=pwd_context.hash("senha123"),
                role=UserRole.trabalhador,
                sector_id=setores[i % len(setores)].id,
                phone=f"4299999{i:04d}",
                is_active=True,
            )
            trabalhadores.append(u)
            db.add(u)

        await db.flush()

        # ── Câmeras ───────────────────────────────────────────────────────────
        cameras = []
        CAMERA_RTSP = {
                    "Produção":      ["rtsp://192.168.1.10/stream", "rtsp://192.168.1.11/stream"],
                    "Manutenção":    ["rtsp://192.168.1.12/stream", "rtsp://192.168.1.13/stream"],
                    "Almoxarifado":  ["rtsp://192.168.1.14/stream", "rtsp://192.168.1.15/stream"],
                    "Expedição":     ["rtsp://192.168.1.16/stream", "rtsp://192.168.1.17/stream"],
                }
        for i, setor in enumerate(setores):
            for j in range(2):
            

                # E dentro do loop de criação de câmeras:
                c = Camera(
                    name=f"Câmera {j+1} — {setor.name}",
                    location=f"{setor.name} — Área {j+1}",
                    sector_id=setor.id,
                    rtsp_url=CAMERA_RTSP[setor.name][j],  # ← campo correto
                    is_active=True,
                )
                cameras.append(c)
                db.add(c)

        await db.flush()

        # ── Ocorrências (últimos 30 dias) ─────────────────────────────────────
        epi_tipos = ["Capacete", "Luvas", "Óculos", "Colete", "Botina", "Protetor auricular"]
        now = datetime.utcnow()

        for days_ago in range(30):
            base_ts = now - timedelta(days=days_ago)
            # Mais ocorrências nos últimos dias (tendência crescente de conformidade)
            qtd = random.randint(8, 20)
            compliance_bias = 0.6 + (30 - days_ago) / 30 * 0.3  # 60% → 90%

            for _ in range(qtd):
                cam = random.choice(cameras)
                status = (
                    OccurrenceStatus.conforme
                    if random.random() < compliance_bias
                    else OccurrenceStatus.nao_conforme
                )
                ts = base_ts.replace(
                    hour=random.randint(6, 22),
                    minute=random.randint(0, 59),
                    second=0,
                )
                epis = random.sample(epi_tipos, k=random.randint(1, 3))
                occ = Occurrence(
                    camera_id=cam.id,
                    sector_id=cam.sector_id,
                    timestamp=ts,
                    status=status,
                    epi_detected=epis,
                    confidence=round(random.uniform(0.72, 0.99), 3),
                    image_path=None,
                    created_at=ts,
                )
                db.add(occ)

        # ── Solicitações de EPI ───────────────────────────────────────────────
        epis_solicitados = ["Capacete", "Luvas de proteção", "Óculos de segurança",
                            "Colete refletivo", "Botina de segurança", "Protetor auricular"]
        statuses = [EPIRequestStatus.pendente] * 4 + \
                   [EPIRequestStatus.aprovada] * 5 + \
                   [EPIRequestStatus.rejeitada] * 2

        for i in range(11):
            trab = random.choice(trabalhadores)
            req = EPIRequest(
                worker_id=trab.id,
                sector_id=trab.sector_id,
                epi_type=random.choice(epis_solicitados),
                reason="Equipamento danificado / vencido",
                status=statuses[i],
                manager_id=gestor.id if statuses[i] != EPIRequestStatus.pendente else None,
                created_at=now - timedelta(days=random.randint(0, 15)),
                updated_at=now - timedelta(days=random.randint(0, 5)),
            )
            db.add(req)

        await db.commit()
        print("✅ Banco populado com sucesso!")
        print(f"   • {len(setores)} setores")
        print(f"   • {1 + len(trabalhadores)} usuários (1 gestor + {len(trabalhadores)} trabalhadores)")
        print(f"   • {len(cameras)} câmeras")
        print(f"   • ~{30 * 14} ocorrências (30 dias)")
        print(f"   • 11 solicitações de EPI")
        print()
        print("Login: admin@episee.com / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
