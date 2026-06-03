"""
Migration: add repost/privacy columns to posts and tag column to comments.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        # Posts columns
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='posts'"
        ))
        columns = [row[0] for row in result.fetchall()]

        for col, col_type in [
            ("allow_comments", "BOOLEAN DEFAULT 1"),
            ("allow_repost", "BOOLEAN DEFAULT 1"),
            ("allow_share", "BOOLEAN DEFAULT 1"),
            ("repost_of", "INTEGER"),
        ]:
            if col in columns:
                print(f"  ✓ {col} already exists in posts")
            else:
                db.execute(text(f"ALTER TABLE posts ADD COLUMN {col} {col_type}"))
                print(f"  ✓ Added {col} to posts")

        # Comments column
        result = db.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='comments'"
        ))
        comment_cols = [row[0] for row in result.fetchall()]
        if "tag" in comment_cols:
            print("  ✓ tag already exists in comments")
        else:
            db.execute(text("ALTER TABLE comments ADD COLUMN tag VARCHAR(50)"))
            print("  ✓ Added tag to comments")

        db.commit()
        print("\nMigration completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
