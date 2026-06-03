from .novel import NovelCreate, NovelUpdate, NovelInDB, NovelDetail
from .chapter import ChapterCreate, ChapterUpdate, ChapterInDB
from .generation import (
    GenerationSessionCreate,
    UserInteractionCreate,
    GenerationSessionInDB,
    GenerationStartResponse,
    GenerationContinueRequest,
    ChapterGeneratedResponse,
)
from .achievement import AchievementOut, UserAchievementOut
