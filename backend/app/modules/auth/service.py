from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from .models import User
from .schemas import UserCreate
from app.core.security import hash_password, verify_password, create_access_token


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, data: UserCreate, role: str = "user") -> User:
    if get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")
    return user


def login_user(db: Session, email: str, password: str) -> dict:
    user = authenticate_user(db, email, password)
    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer", "user": user}
