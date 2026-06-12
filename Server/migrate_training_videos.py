"""Migração manual: cria as tabelas epi_types e training_videos no SQLite."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "episee.db")

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

cur.executescript("""
CREATE TABLE IF NOT EXISTS epi_types (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nome         VARCHAR(100) NOT NULL UNIQUE,
    descricao    TEXT,
    quando_usar  TEXT,
    como_usar    TEXT,
    erros_comuns TEXT,
    nr6_ref      VARCHAR(100),
    criado_em    DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS training_videos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    epi_type_id  INTEGER NOT NULL REFERENCES epi_types(id) ON DELETE CASCADE,
    titulo       VARCHAR(200) NOT NULL,
    url          VARCHAR(500) NOT NULL,
    descricao    TEXT,
    fonte        VARCHAR(150),
    aprovado     BOOLEAN NOT NULL DEFAULT 1,
    prioridade   INTEGER NOT NULL DEFAULT 0,
    criado_em    DATETIME DEFAULT (datetime('now'))
);
""")

conn.commit()
conn.close()
print("✅ Tabelas epi_types e training_videos criadas com sucesso!")
