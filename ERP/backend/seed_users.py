import sys
import os
from datetime import datetime

# Add the current directory to sys.path for importing app
sys.path.append(os.getcwd())

from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app()

def seed_new_users():
    with app.app_context():
        # User details from prompt
        new_users = [
            {
                "name": "Sasi",
                "email": "sasi@skyline.com",
                "password": "sasi_password",
                "role": "Business Development Head"
            },
            {
                "name": "Swetha",
                "email": "swetha@skyline.com",
                "password": "swetha_password",
                "role": "HR"
            },
            {
                "name": "Mathesh",
                "email": "mathesh@skyline.com",
                "password": "mathesh_password",
                "role": "Website & SEO Head"
            }
        ]

        for u_data in new_users:
            existing_user = User.query.filter_by(email=u_data["email"]).first()
            if not existing_user:
                u = User(
                    name=u_data["name"],
                    email=u_data["email"],
                    role=u_data["role"],
                    is_active=True
                )
                u.set_password(u_data["password"])
                db.session.add(u)
                print(f"Created user: {u_data['name']} ({u_data['role']})")
            else:
                print(f"User {u_data['name']} already exists.")

        db.session.commit()

if __name__ == "__main__":
    seed_new_users()
