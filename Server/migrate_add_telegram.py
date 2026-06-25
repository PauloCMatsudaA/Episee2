import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "episee.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN telegram_link_code VARCHAR(20)")
    print("✅ Coluna telegram_link_code adicionada")
except sqlite3.OperationalError as e:
    print(f"ℹ️  telegram_link_code: {e}")

try:
    cursor.execute("ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50)")
    print("✅ Coluna telegram_chat_id adicionada")
except sqlite3.OperationalError as e:
    print(f"ℹ️  telegram_chat_id: {e}")

conn.commit()
conn.close()
print("🎉 Migração concluída!")
