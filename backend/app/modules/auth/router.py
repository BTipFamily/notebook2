from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from .schemas import UserCreate, UserLogin, TokenResponse, UserResponse, PasswordChange, UserUpdate, AdminCreateUser
from .models import User
from . import service
from app.core.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    user = service.create_user(db, data)
    result = service.login_user(db, data.email, data.password)
    return result


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    return service.login_user(db, data.email, data.password)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated"}


# ── Admin: User Management ────────────────────────────────────────────────────

@router.get("/admin/users", response_model=List[UserResponse])
def admin_list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/admin/users", response_model=UserResponse)
def admin_create_user(
    data: AdminCreateUser,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    from .schemas import UserCreate as UC
    return service.create_user(db, UC(email=data.email, full_name=data.full_name, password=data.password), role=data.role)


@router.put("/admin/users/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_id == admin.id and data.role and data.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot remove your own admin role")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.post("/admin/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    new_password = body.get("new_password", "")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password reset successfully"}
