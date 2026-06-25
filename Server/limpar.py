import shutil
import sqlite3
from pathlib import Path
import sqlite3
from pathlib import Path

db = next(Path(".").glob("*.db"))
conn = sqlite3.connect(db)

conn.execute("UPDATE cameras SET rtsp_url = '0' WHERE id = 1")
conn.execute("UPDATE cameras SET rtsp_url = '1' WHERE id = 2")
conn.commit()
conn.close()
print("✅ Pronto")

DB_PATH  = Path("episee.db")          
HLS_DIR  = Path("hls")                

if not DB_PATH.exists():
    
    encontrados = list(Path(".").glob("*.db"))
    if not encontrados:
        print("❌ Nenhum arquivo .db encontrado na pasta Server/")
        print("   Informe o nome correto em DB_PATH no topo do script.")
        exit(1)
    DB_PATH = encontrados[0]
    print(f"   Usando banco encontrado: {DB_PATH}")

if not HLS_DIR.exists():
    print(f"✅ Pasta HLS '{HLS_DIR}' não existe — nada a limpar.")
    exit(0)

conn = sqlite3.connect(DB_PATH)
ids_ativos = {row[0] for row in conn.execute("SELECT id FROM cameras").fetchall()}
conn.close()
print(f"   Câmeras no banco: {sorted(ids_ativos)}")

pastas = [p for p in HLS_DIR.iterdir() if p.is_dir() and p.name.isdigit()]
removidas = 0
for pasta in pastas:
    if int(pasta.name) not in ids_ativos:
        print(f"   🗑  Removendo HLS órfão: {pasta}")
        shutil.rmtree(pasta, ignore_errors=True)
        removidas += 1

if removidas == 0:
    print("✅ Nenhuma pasta órfã encontrada.")
else:
    print(f"✅ {removidas} pasta(s) removida(s) com sucesso.")
