from app import create_app
from app.models.user import User
app = create_app()
with app.app_context():
    for u in User.query.all():
        print(f"ID: {u.id}, Name: {u.name}, Role: {u.role}")
