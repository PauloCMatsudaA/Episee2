import asyncio
import aiosqlite
import os

async def criar():
    db_path = os.path.join(os.getcwd(), 'episee.db')
    print(f'Conectando em: {db_path}')
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "CREATE TABLE IF NOT EXISTS notifications ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
            "tipo VARCHAR(20) NOT NULL DEFAULT 'info', "
            "texto TEXT NOT NULL, "
            "lida BOOLEAN NOT NULL DEFAULT 0, "
            "criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
            ")"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_id "
            "ON notifications(user_id)"
        )
        await db.commit()
        print('Tabela notifications criada com sucesso!')

asyncio.run(criar())