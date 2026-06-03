"""
Migration: add tag column to posts table for slash-command message tagging.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from sqlalchemy import text


def add_tag_column():
    db = SessionLocal()
    try:
        result = db.execute(text("PRAGMA table_info(posts)"))
        columns = [row[1] for row in result.fetchall()]
        
        if "tag" in columns:
            print("✓ tag column already exists in posts table")
            return
        
        db.execute(text("ALTER TABLE posts ADD COLUMN tag VARCHAR(50)"))
        db.commit()
        print("✓ Successfully added tag column to posts table")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_tag_column()
