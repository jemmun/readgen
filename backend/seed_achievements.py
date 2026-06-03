"""Seed script to populate default achievements in the database.
Run this once to initialize the achievement system.
"""

from app.db.session import SessionLocal
from app.models import Achievement

DEFAULT_ACHIEVEMENTS = [
    # Writing Achievements
    {
        "key": "first_novel",
        "name": "First Steps",
        "description": "Create your first novel",
        "icon": "📝",
        "category": "writing",
        "requirement_type": "count",
        "requirement_value": 1,
    },
    {
        "key": "prolific_writer",
        "name": "Prolific Writer",
        "description": "Create 10 novels",
        "icon": "✍️",
        "category": "writing",
        "requirement_type": "count",
        "requirement_value": 10,
    },
    {
        "key": "chapter_master",
        "name": "Chapter Master",
        "description": "Write 50 chapters",
        "icon": "📚",
        "category": "writing",
        "requirement_type": "count",
        "requirement_value": 50,
    },
    {
        "key": "word_warrior",
        "name": "Word Warrior",
        "description": "Write 100,000 words total",
        "icon": "⚔️",
        "category": "writing",
        "requirement_type": "threshold",
        "requirement_value": 100000,
    },
    {
        "key": "novel_master",
        "name": "Novel Master",
        "description": "Complete a novel with 20+ chapters",
        "icon": "🏆",
        "category": "writing",
        "requirement_type": "milestone",
        "requirement_value": 20,
    },
    
    # Reading Achievements
    {
        "key": "avid_reader",
        "name": "Avid Reader",
        "description": "Read 10 novels",
        "icon": "📖",
        "category": "reading",
        "requirement_type": "count",
        "requirement_value": 10,
    },
    {
        "key": "bookworm",
        "name": "Bookworm",
        "description": "Read 50 novels",
        "icon": "🐛",
        "category": "reading",
        "requirement_type": "count",
        "requirement_value": 50,
    },
    {
        "key": "reviewer",
        "name": "Reviewer",
        "description": "Write 5 reviews",
        "icon": "⭐",
        "category": "reading",
        "requirement_type": "count",
        "requirement_value": 5,
    },
    
    # Social Achievements
    {
        "key": "social_butterfly",
        "name": "Social Butterfly",
        "description": "Follow 10 users",
        "icon": "🦋",
        "category": "social",
        "requirement_type": "count",
        "requirement_value": 10,
    },
    {
        "key": "popular_author",
        "name": "Popular Author",
        "description": "Get 50 followers",
        "icon": "🌟",
        "category": "social",
        "requirement_type": "count",
        "requirement_value": 50,
    },
    {
        "key": "idea_contributor",
        "name": "Idea Contributor",
        "description": "Post 20 ideas",
        "icon": "💡",
        "category": "social",
        "requirement_type": "count",
        "requirement_value": 20,
    },
    {
        "key": "liked_post",
        "name": "Well Liked",
        "description": "Receive 100 likes on your posts",
        "icon": "❤️",
        "category": "social",
        "requirement_type": "threshold",
        "requirement_value": 100,
    },
    
    # Collaboration Achievements
    {
        "key": "team_player",
        "name": "Team Player",
        "description": "Join 3 groups",
        "icon": "🤝",
        "category": "collaboration",
        "requirement_type": "count",
        "requirement_value": 3,
    },
    {
        "key": "group_leader",
        "name": "Group Leader",
        "description": "Create your own group",
        "icon": "👑",
        "category": "collaboration",
        "requirement_type": "count",
        "requirement_value": 1,
    },
    {
        "key": "collaborative_writer",
        "name": "Collaborative Writer",
        "description": "Contribute to 5 group novels",
        "icon": "📝",
        "category": "collaboration",
        "requirement_type": "count",
        "requirement_value": 5,
    },
    {
        "key": "active_member",
        "name": "Active Member",
        "description": "Send 500 messages in groups",
        "icon": "💬",
        "category": "collaboration",
        "requirement_type": "threshold",
        "requirement_value": 500,
    },
]


def seed_achievements():
    """Seed the database with default achievements."""
    db = SessionLocal()
    
    try:
        existing_count = db.query(Achievement).count()
        if existing_count > 0:
            print(f"⚠️  Database already has {existing_count} achievements. Skipping seed.")
            return
        
        achievements = []
        for data in DEFAULT_ACHIEVEMENTS:
            achievement = Achievement(**data)
            achievements.append(achievement)
        
        db.add_all(achievements)
        db.commit()
        
        print(f"✅ Successfully seeded {len(achievements)} achievements!")
        
    except Exception as e:
        print(f"❌ Error seeding achievements: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("  Achievement System Seeder")
    print("=" * 60)
    print()
    seed_achievements()
