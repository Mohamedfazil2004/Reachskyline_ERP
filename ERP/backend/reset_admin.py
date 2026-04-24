from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app()
with app.app_context():
    user = User.query.filter_by(email='admin@erp.com').first()
    if user:
        user.set_password('admin123')
        db.session.commit()
        print("Password for admin@erp.com has been reset to 'admin123'")
    else:
        print("User admin@erp.com not found")
