from app import create_app
from app.models.user import User

app = create_app()
with app.app_context():
    user = User.query.filter_by(email='admin@erp.com').first()
    if user:
        print(f"User found: {user.email}")
        print(f"Password check 'admin123': {user.check_password('admin123')}")
    else:
        print("User admin@erp.com not found")
