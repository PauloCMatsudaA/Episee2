"""camera_id_nullable_occurrence

Revision ID: e74d64006e0b
Revises: 40cc84269da7
Create Date: 2026-06-09 18:30:11.958543+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e74d64006e0b'
down_revision: Union[str, None] = '40cc84269da7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('occurrences') as batch_op:
        batch_op.alter_column('camera_id',
            existing_type=sa.Integer(),
            nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('occurrences') as batch_op:
        batch_op.alter_column('camera_id',
            existing_type=sa.Integer(),
            nullable=False)
