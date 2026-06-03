from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import BackgroundTasks
from sqlalchemy import text
from app.db.base import Base, engine
from app.routers import (
    novels_router, chapters_router, generation_router,
    auth_router, posts_router, comments_router,
    follows_router, likes_router, users_router,
    groups_router, illustrations_router, exports_router, achievements_router,
)
from app.routers.bookmarks import router as bookmarks_router
from app.routers.reading_progress import router as reading_progress_router
from app.routers.notifications import router as notifications_router
from app.routers.messages import router as messages_router
from app.routers.reports import router as reports_router
from app.routers.feedback import router as feedback_router
from app.routers.reviews import router as reviews_router
from app.routers.novel_tags import router as novel_tags_router
from app.routers.writing_assistant import router as writing_assistant_router
from app.routers.tips import router as tips_router
from app.routers.cache import router as cache_router
from app.routers.plot_conflicts import router as plot_conflicts_router
from app.routers.writing_templates import router as writing_templates_router
from app.routers.character_relationships import router as character_relationships_router
from app.routers.enhanced_search import router as enhanced_search_router
from app.routers.creation_challenges import router as creation_challenges_router
from app.routers.copyright import router as copyright_router
from app.routers.quality_content import router as quality_content_router
from app.routers.images import router as images_router
from app.routers.multi_character_dialogue import router as multi_character_dialogue_router
from app.utils.cache import cache_manager
import os

Base.metadata.create_all(bind=engine)

# Lightweight startup migration: add columns/tables if missing
def _run_migrations():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE novels ADD COLUMN is_published BOOLEAN DEFAULT 0"))
            conn.commit()
            print("Migration applied: added is_published column to novels")
        except Exception:
            pass
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS qr_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token VARCHAR(64) UNIQUE NOT NULL,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL
                )
            '''))
            conn.commit()
            print("Migration applied: created qr_tokens table")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20)"))
            conn.commit()
            print("Migration applied: added oauth_provider column to users")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN oauth_id VARCHAR(100)"))
            conn.commit()
            print("Migration applied: added oauth_id column to users")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE illustrations ADD COLUMN description TEXT"))
            conn.commit()
            print("Migration applied: added description column to illustrations")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE illustrations ADD COLUMN tags VARCHAR(500)"))
            conn.commit()
            print("Migration applied: added tags column to illustrations")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE illustrations ADD COLUMN novel_id INTEGER REFERENCES novels(id)"))
            conn.commit()
            print("Migration applied: added novel_id column to illustrations")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE illustrations ADD COLUMN illustration_type VARCHAR(50) DEFAULT 'illustration'"))
            conn.commit()
            print("Migration applied: added illustration_type column to illustrations")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE novels ADD COLUMN cover_image_url VARCHAR(500)"))
            conn.commit()
            print("Migration applied: added cover_image_url column to novels")
        except Exception:
            pass
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS bookmarks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_bookmark UNIQUE(post_id, user_id)
                )
            '''))
            conn.commit()
            print("Migration applied: created bookmarks table")
        except Exception:
            pass
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS reading_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    novel_id INTEGER REFERENCES novels(id) ON DELETE CASCADE,
                    chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
                    scroll_position INTEGER DEFAULT 0,
                    note TEXT,
                    updated_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_reading_progress UNIQUE(user_id, novel_id)
                )
            '''))
            conn.commit()
            print("Migration applied: created reading_progress table")
        except Exception:
            pass
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    type VARCHAR(50) NOT NULL,
                    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
                    message TEXT,
                    is_read BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)"))
            conn.commit()
            print("Migration applied: created notifications table")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE"))
            conn.commit()
            print("Migration applied: added parent_id column to comments")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE groups ADD COLUMN invite_code VARCHAR(64)"))
            conn.commit()
            print("Migration applied: added invite_code column to groups")
        except Exception:
            pass
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    is_read INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            conn.commit()
            print("Migration applied: created messages table")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE posts ADD COLUMN approval_note TEXT"))
            conn.commit()
            print("Migration applied: added approval_note column to posts")
        except Exception:
            pass
        # Multi-image support for posts
        try:
            conn.execute(text("ALTER TABLE posts ADD COLUMN image_urls TEXT"))
            conn.commit()
            print("Migration applied: added image_urls column to posts")
        except Exception:
            pass
        # A-P1: illustration chapter_id
        try:
            conn.execute(text("ALTER TABLE illustrations ADD COLUMN chapter_id INTEGER REFERENCES chapters(id)"))
            conn.commit()
            print("Migration applied: added chapter_id column to illustrations")
        except Exception:
            pass
        # A-P3: illustration style_seed
        try:
            conn.execute(text("ALTER TABLE illustrations ADD COLUMN style_seed VARCHAR(100)"))
            conn.commit()
            print("Migration applied: added style_seed column to illustrations")
        except Exception:
            pass
        # D-P3: message image_url
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN image_url VARCHAR(500)"))
            conn.commit()
            print("Migration applied: added image_url column to messages")
        except Exception:
            pass
        # E-P4/E-P5: group invite_code and announcement
        try:
            conn.execute(text("ALTER TABLE groups ADD COLUMN announcement TEXT"))
            conn.commit()
            print("Migration applied: added announcement column to groups")
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE groups ADD COLUMN invite_code VARCHAR(50) UNIQUE"))
            conn.commit()
            print("Migration applied: added invite_code column to groups")
        except Exception:
            pass
        # h1: novel_reviews table
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS novel_reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    novel_id INTEGER REFERENCES novels(id) ON DELETE CASCADE NOT NULL,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                    rating INTEGER NOT NULL,
                    review_text TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    CONSTRAINT uq_novel_review UNIQUE(novel_id, user_id)
                )
            '''))
            conn.commit()
            print("Migration applied: created novel_reviews table")
        except Exception:
            pass
        # h3: novel_tags table
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS novel_tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    novel_id INTEGER REFERENCES novels(id) ON DELETE CASCADE NOT NULL,
                    tag VARCHAR(50) NOT NULL
                )
            '''))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_novel_tags_tag ON novel_tags(tag)"))
            conn.commit()
            print("Migration applied: created novel_tags table")
        except Exception:
            pass
        # h5: reports table
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                    target_type VARCHAR(20) NOT NULL,
                    target_id INTEGER NOT NULL,
                    reason TEXT,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            conn.commit()
            print("Migration applied: created reports table")
        except Exception:
            pass
        # i1: feedback table
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    category VARCHAR(50) NOT NULL,
                    content TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            conn.commit()
            print("Migration applied: created feedback table")
        except Exception:
            pass
        # Achievement system tables
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key VARCHAR(100) UNIQUE NOT NULL,
                    name VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    icon VARCHAR(50) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    requirement_type VARCHAR(50) NOT NULL,
                    requirement_value INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            conn.commit()
            print("Migration applied: created achievements table")
        except Exception:
            pass
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS user_achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
                    progress INTEGER DEFAULT 0,
                    is_unlocked BOOLEAN DEFAULT 0,
                    unlocked_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_user_achievement UNIQUE(user_id, achievement_id)
                )
            '''))
            conn.commit()
            print("Migration applied: created user_achievements table")
        except Exception:
            pass

_run_migrations()

app = FastAPI(
    title="Novel Generator API",
    description="AI-powered interactive novel generation backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(posts_router)
app.include_router(comments_router)
app.include_router(follows_router)
app.include_router(likes_router)
app.include_router(bookmarks_router)
app.include_router(reading_progress_router)
app.include_router(notifications_router)
app.include_router(messages_router)
app.include_router(reports_router)
app.include_router(feedback_router)
app.include_router(reviews_router)
app.include_router(novel_tags_router)
app.include_router(groups_router)
app.include_router(illustrations_router)
app.include_router(novels_router)
app.include_router(writing_assistant_router)
app.include_router(tips_router)
app.include_router(cache_router)
app.include_router(plot_conflicts_router)
app.include_router(writing_templates_router)
app.include_router(character_relationships_router)
app.include_router(enhanced_search_router)
app.include_router(creation_challenges_router)
app.include_router(copyright_router)
app.include_router(quality_content_router)
app.include_router(images_router)
app.include_router(multi_character_dialogue_router)
app.include_router(chapters_router)
app.include_router(generation_router)
app.include_router(exports_router)
app.include_router(achievements_router)


@app.get("/")
def root():
    return {"message": "Novel Generator API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Mount static files for illustration uploads
os.makedirs("uploads/illustrations", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
