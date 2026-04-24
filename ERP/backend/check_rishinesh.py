from app import create_app
from app.models.user import User
app = create_app()
with app.app_context():
    u = User.query.filter(User.name.ilike('%Rishinesh%')).first()
    if u:
        print(f"User: {u.name}, Role: '{u.role}', ID: {u.id}")
    else:
        print("User Rishinesh not found")
