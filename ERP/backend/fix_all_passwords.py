from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app()
with app.app_context():
    # Define credentials to reset
    credentials = {
        'admin@erp.com': 'admin123',
        'swetha@skyline.com': 'swetha_password',
        'sasi@skyline.com': 'sasi_password',
        'mathesh@reachskyline.com': 'Mathesh@123',
        'sri@skyline.com': 'pass123',
        'abirami@skyline.com': 'pass123',
        'rishinesh@reachskyline.com': 'pass123',
        'rajaguru@reachskyline.com': 'pass123',
        'visalam@reachskyline.com': 'pass123',
        'kesavan@reachskyline.com': 'pass123',
        'fazil@reachskyline.com': 'Fazil@123',
        'kousic@reachskyline.com': 'Kousic@123',
        'dharan@reachskyline.com': 'Dharan@123',
    }
    
    for email, pwd in credentials.items():
        user = User.query.filter_by(email=email).first()
        if user:
            user.set_password(pwd)
            print(f"Updated password for: {email}")
        else:
            print(f"User NOT found: {email}")
            
    db.session.commit()
    print("\nAll specified passwords have been updated successfully.")
