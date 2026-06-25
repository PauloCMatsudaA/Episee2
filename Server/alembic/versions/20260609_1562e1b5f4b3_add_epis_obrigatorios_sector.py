from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

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
