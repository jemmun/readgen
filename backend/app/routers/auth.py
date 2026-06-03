from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.qr_token import QRToken
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserProfile, OAuthLoginRequest
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user_required, get_current_user
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        display_name=data.display_name or data.username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user_id=user.id)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user_id=user.id)


@router.get("/me", response_model=UserProfile)
def me(current_user: User = Depends(get_current_user_required)):
    return current_user


@router.post("/qr-token")
def generate_qr_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    token_str = QRToken.generate_token()
    expires = datetime.utcnow() + timedelta(minutes=5)
    qr = QRToken(token=token_str, user_id=current_user.id, status="pending", expires_at=expires)
    db.add(qr)
    db.commit()
    return {"token": token_str, "expires_at": expires.isoformat()}


@router.post("/qr-login", response_model=TokenResponse)
def qr_login(token: str, db: Session = Depends(get_db)):
    qr = db.query(QRToken).filter(QRToken.token == token).first()
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid QR token")
    if qr.status != "pending":
        raise HTTPException(status_code=400, detail="QR token already used")
    if qr.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="QR token expired")
    if not qr.user_id:
        raise HTTPException(status_code=400, detail="QR token not bound to user")
    user = db.query(User).filter(User.id == qr.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    qr.status = "used"
    db.commit()
    access_token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=access_token, user_id=user.id)


@router.get("/qr-login/status/{token}")
def qr_login_status(token: str, db: Session = Depends(get_db)):
    qr = db.query(QRToken).filter(QRToken.token == token).first()
    if not qr:
        return {"status": "invalid"}
    if qr.expires_at < datetime.utcnow():
        return {"status": "expired"}
    return {"status": qr.status, "user_id": qr.user_id}


@router.post("/oauth", response_model=TokenResponse)
def oauth_login(data: OAuthLoginRequest, db: Session = Depends(get_db)):
    # In production, verify the token with the provider's public keys here.
    # For this implementation we trust the frontend-sent token after basic checks.
    if not data.token or not data.provider:
        raise HTTPException(status_code=400, detail="Provider and token are required")

    # Build a composite oauth id from token to avoid storing raw tokens
    composite_oauth_id = f"{data.provider}:{data.token[:32]}"

    # Look for existing user by OAuth provider + id
    user = db.query(User).filter(
        User.oauth_provider == data.provider,
        User.oauth_id == composite_oauth_id
    ).first()

    if not user:
        # Auto-generate a unique username
        base_username = data.email.split('@')[0] if data.email else f"{data.provider}_user"
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User(
            username=username,
            password_hash=get_password_hash(secrets.token_urlsafe(32)),
            display_name=data.name or username,
            oauth_provider=data.provider,
            oauth_id=composite_oauth_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=access_token, user_id=user.id)
