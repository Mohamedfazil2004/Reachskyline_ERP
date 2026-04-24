from app.extensions import db
from app import create_app
from app.models.automation import AutomationRoughCut, AutomationTask
from app.models.user import User

app = create_app()
with app.app_context():
    # Check table
    try:
        count = AutomationRoughCut.query.count()
        print(f"Rough Cuts count: {count}")
    except Exception as e:
        print(f"Table check failed: {e}")

    # Check active user roles
    users = User.query.filter(User.role.in_(['Admin', 'Manager', 'Brand Manager'])).all()
    print("Privileged Users:")
    for u in users:
        print(f"ID: {u.id} | Name: {u.name} | Role: {u.role}")
