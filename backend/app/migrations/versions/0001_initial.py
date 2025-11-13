"""initial tables

Revision ID: 0001_init
Revises: 
Create Date: 2025-11-11

"""
from alembic import op
import sqlalchemy as sa

revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), server_default=""),
        sa.Column('role', sa.String(), server_default="user"),
        sa.Column('is_active', sa.Boolean, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_table('projects',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text, server_default=""),
        sa.Column('owner_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_table('files',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('project_id', sa.Integer, sa.ForeignKey('projects.id')),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), server_default="application/octet-stream"),
        sa.Column('size', sa.Integer, server_default="0"),
        sa.Column('storage_path', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_table('messages',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('project_id', sa.Integer, sa.ForeignKey('projects.id')),
        sa.Column('user_id', sa.Integer, nullable=True),
        sa.Column('role', sa.String(), server_default="user"),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_table('tasks',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('project_id', sa.Integer, sa.ForeignKey('projects.id')),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default="todo"),
        sa.Column('meta', sa.JSON, server_default=sa.text("'{}'")),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_table('policies',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(), unique=True, nullable=False),
        sa.Column('rules', sa.JSON, server_default=sa.text("'{}'")),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource', sa.String(), nullable=False),
        sa.Column('details', sa.JSON, server_default=sa.text("'{}'")),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

def downgrade():
    for name in ['audit_logs','policies','tasks','messages','files','projects','users']:
        op.drop_table(name)
