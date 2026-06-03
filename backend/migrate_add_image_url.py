#!/usr/bin/env python3
"""
Migration script to add image_url column to posts table.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.db.base import SessionLocal, engine
from sqlalchemy import text

def add_image_url_column():
    """Add image_url column to posts table if it doesn't exist."""
    db = SessionLocal()
    try:
        # Check if column already exists
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='posts' AND column_name='image_url'"
        ))
        exists = result.fetchone() is not None

        if exists:
            print("✓ image_url column already exists in posts table")
            return
        
        # Add the column
        db.execute(text("ALTER TABLE posts ADD COLUMN image_url VARCHAR(500)"))
        db.commit()
        print("✓ Successfully added image_url column to posts table")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Running migration: Add image_url to posts table...")
    add_image_url_column()
    print("Migration completed!")
