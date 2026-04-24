from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.master import ActivityType

app = create_app()

def seed_data():
    with app.app_context():
        # Create Tables
        db.create_all()
        
        # Ensure Admin exists with correct password
        admin = User.query.filter_by(email='admin@erp.com').first()
        if not admin:
            admin = User(name='System Admin', email='admin@erp.com', role='Admin')
            admin.set_password('admin123')
            db.session.add(admin)
            print("Admin user created: admin@erp.com / admin123")
        else:
            admin.set_password('admin123')
            print("Admin password reset to: admin123")
            
        # Seed Activity Types
        types = [
            {'name': 'Poster', 'code': 'P'},
            {'name': 'Reel', 'code': 'R'},
            {'name': 'Shorts', 'code': 'S'},
            {'name': 'Longform', 'code': 'LF'},
            {'name': 'Carousel', 'code': 'CAR'},
            {'name': 'Event Day', 'code': 'EV'},
            {'name': 'Job Work', 'code': 'JW'}
        ]
        
        for t in types:
            if not ActivityType.query.filter_by(code=t['code']).first():
                db.session.add(ActivityType(name=t['name'], code=t['code']))
                print(f"Activity Type added: {t['name']}")
                
        db.session.commit()
        print("Database seeded successfully!")

if __name__ == '__main__':
    seed_data()
