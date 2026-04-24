from app import create_app
from app.models.user import User

app = create_app()
with app.app_context():
    users_to_check = [
        ('admin@erp.com', 'admin123'),
        ('swetha@skyline.com', 'swetha_password'),
        ('sasi@skyline.com', 'sasi_password'),
        ('mathesh@skyline.com', 'mathesh_password'),
        ('mathesh@reachskyline.com', 'Mathesh@123'),
        ('sri@sky.com', 'pass123'),
    ]
    for email, pwd in users_to_check:
        user = User.query.filter_by(email=email).first()
        if user:
            is_valid = user.check_password(pwd)
            print(f"Check {email} / {pwd}: {is_valid}")
        else:
            print(f"User {email} not found")
