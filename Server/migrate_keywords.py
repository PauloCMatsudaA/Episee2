"""Migração manual: adiciona coluna palavras_chave na tabela epi_types.

Execute UMA vez após o deploy:
    python migrate_keywords.py
"""
import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", "./episee.db")

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Verifica se a coluna já existe
    cursor.execute("PRAGMA table_info(epi_types)")
    colunas = [row[1] for row in cursor.fetchall()]

    if "palavras_chave" not in colunas:
        cursor.execute(
            "ALTER TABLE epi_types ADD COLUMN palavras_chave TEXT"
        )
        conn.commit()
        print("[OK] Coluna 'palavras_chave' adicionada em epi_types.")
    else:
        print("[INFO] Coluna 'palavras_chave' já existe. Nada a fazer.")

    conn.close()

if __name__ == "__main__":
    main()
