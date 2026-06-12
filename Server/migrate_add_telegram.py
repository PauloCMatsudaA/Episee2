import sqlite3
import os

# Ajuste o caminho se o .db estiver em lugar diferente
DB_PATH = os.path.join(os.path.dirname(__file__), "episee.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Verifica e adiciona telegram_link_code
try:
    cursor.execute("ALTER TABLE users ADD COLUMN telegram_link_code VARCHAR(20)")
    print("✅ Coluna telegram_link_code adicionada")
except sqlite3.OperationalError as e:
    print(f"ℹ️  telegram_link_code: {e}")

# Verifica e adiciona telegram_chat_id
try:
    cursor.execute("ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50)")
    print("✅ Coluna telegram_chat_id adicionada")
except sqlite3.OperationalError as e:
    print(f"ℹ️  telegram_chat_id: {e}")

conn.commit()
conn.close()
print("🎉 Migração concluída!")