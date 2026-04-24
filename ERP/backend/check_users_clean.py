from app import create_app
from app.models.user import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"DEBUG_START")
    print(f"COUNT:{len(users)}")
    for u in users:
        print(f"USER|{u.name}|{u.email}|{u.role}|{u.is_active}")
    print(f"DEBUG_END")
