import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "episee.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(users)")
columns = [row[1] for row in cursor.fetchall()]

if "is_active" not in columns:
    print("Coluna is_active já foi removida. Nada a fazer.")
    conn.close()
    exit()
    

print("Recriando tabela users sem is_active...")

cursor.executescript("""
    PRAGMA foreign_keys = OFF;

    CREATE TABLE users_new (
        id              INTEGER PRIMARY KEY,
        name            VARCHAR(150) NOT NULL,
        email           VARCHAR(200) NOT NULL UNIQUE,
        hashed_password VARCHAR(255) NOT NULL,
        role            VARCHAR(20)  NOT NULL DEFAULT 'trabalhador',
        sector_id       INTEGER REFERENCES sectors(id),
        phone           VARCHAR(20),
        created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO users_new (id, name, email, hashed_password, role, sector_id, phone, created_at)
    SELECT                  id, name, email, hashed_password, role, sector_id, phone, created_at
    FROM users;

    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;

    CREATE UNIQUE INDEX ix_users_email ON users (email);
    CREATE        INDEX ix_users_id    ON users (id);

    PRAGMA foreign_keys = ON;
""")

conn.commit()
conn.close()
print("Concluído! Coluna is_active removida com sucesso.")
