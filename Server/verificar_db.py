import asyncio
import aiosqlite

async def verificar():
    async with aiosqlite.connect('episee.db') as db:
        async with db.execute("SELECT name FROM sqlite_master WHERE type='table'") as cur:
            tabelas = await cur.fetchall()
            print('Tabelas no banco:')
            for t in tabelas:
                print(' -', t[0])

asyncio.run(verificar())