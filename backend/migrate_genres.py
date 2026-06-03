#!/usr/bin/env python3
"""
Migration script to fix invalid genre values in the database.
Updates old genre values to the nearest valid genre.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.db.base import SessionLocal
from sqlalchemy import text

# Valid genres
VALID_GENRES = [
    "historical", "wuxia", "romance", "scifi", "fantasy",
    "xuanhuan", "urban", "xianxia", "apocalyptic", "military",
    "detective", "supernatural"
]

# Mapping of old/invalid genres to valid ones
GENRE_MAPPING = {
    "thriller": "detective",
    "horror": "supernatural",
    "adventure": "fantasy",
    "comedy": "urban",
    "drama": "romance",
    "action": "wuxia",
    "mystery": "detective",
    "sci-fi": "scifi",
    "science fiction": "scifi",
    "": None,  # Empty string -> NULL
}

def migrate_genres():
    """Update invalid genre values to valid ones."""

    print("🔍 Checking for invalid genres...")

    db = SessionLocal()

    try:
        # Get all unique genres
        result = db.execute(text("SELECT DISTINCT genre FROM novels WHERE genre IS NOT NULL"))
        all_genres = [row[0] for row in result.fetchall()]

        print(f"\n📊 Found {len(all_genres)} unique genre(s):")
        for genre in all_genres:
            print(f"  - {genre}")

        # Find invalid genres
        invalid_genres = [g for g in all_genres if g not in VALID_GENRES]

        if not invalid_genres:
            print("\n✅ All genres are valid! No migration needed.")
            return True

        print(f"\n⚠️  Found {len(invalid_genres)} invalid genre(s):")
        for genre in invalid_genres:
            print(f"  - {genre}")

        # Update invalid genres
        updated_count = 0
        for invalid_genre in invalid_genres:
            # Find mapping or default to 'urban'
            valid_genre = GENRE_MAPPING.get(invalid_genre, "urban")

            if valid_genre is None:
                # Set to NULL for empty strings
                result = db.execute(
                    text("UPDATE novels SET genre = NULL WHERE genre = :genre"),
                    {"genre": invalid_genre}
                )
                print(f"  🔄 '{invalid_genre}' -> NULL (removed)")
            else:
                result = db.execute(
                    text("UPDATE novels SET genre = :valid WHERE genre = :invalid"),
                    {"valid": valid_genre, "invalid": invalid_genre}
                )
                print(f"  🔄 '{invalid_genre}' -> '{valid_genre}'")

            updated_count += result.rowcount

        db.commit()

        print(f"\n✅ Successfully updated {updated_count} novel(s)")
        print("✅ Migration completed!")

        # Verify
        result = db.execute(text("SELECT DISTINCT genre FROM novels WHERE genre IS NOT NULL"))
        remaining_genres = [row[0] for row in result.fetchall()]
        invalid_remaining = [g for g in remaining_genres if g not in VALID_GENRES]

        if invalid_remaining:
            print(f"\n⚠️  Warning: Still have invalid genres: {invalid_remaining}")
        else:
            print("\n✅ All genres are now valid!")

        return True

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  Novel Genre Migration Script")
    print("=" * 60)
    print()
    
    success = migrate_genres()
    
    print()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!")
    
    exit(0 if success else 1)
