"""
Migration: add status column to posts table for message approval workflow.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from sqlalchemy import text


def add_status_column():
    db = SessionLocal()
    try:
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='posts'"
        ))
        columns = [row[0] for row in result.fetchall()]
        
        if "status" in columns:
            print("✓ status column already exists in posts table")
            return
        
        # Add status with default 'approved' for existing posts
        db.execute(text("ALTER TABLE posts ADD COLUMN status VARCHAR(20) DEFAULT 'approved' NOT NULL"))
        db.commit()
        print("✓ Successfully added status column to posts table")
        print("  All existing posts default to 'approved'")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_status_column()
