from app.extensions import db
from app import create_app
from app.models.user import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print("ID | Name | Email | Role")
    for u in users:
        print(f"{u.id} | {u.name} | {u.email} | {u.role}")
