"""add_epis_obrigatorios_sector

Revision ID: 1562e1b5f4b3
Revises: e74d64006e0b
Create Date: 2026-06-09 18:47:51.225667+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1562e1b5f4b3'
down_revision: Union[str, None] = 'e74d64006e0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('sectors') as batch_op:
        batch_op.add_column(
            sa.Column('epis_obrigatorios', sa.JSON(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table('sectors') as batch_op:
        batch_op.drop_column('epis_obrigatorios')
