from app import create_app
from app.models.user import User
from app.extensions import db

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"Name: {u.name}, Email: {u.email}, Role: {u.role}, Active: {u.is_active}")
