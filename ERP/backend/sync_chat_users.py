from app import create_app
from app.models.user import User
from app.extensions import db

app = create_app()
with app.app_context():
    # HR - Swetha (15) - Correct
    # Sasi - BD Head (14) - Correct
    # Mathesh - Website Head (16/21) - Correct
    
    # Mounish (22) -> Admin
    u_mounish = User.query.get(22)
    if u_mounish:
        u_mounish.role = 'Admin'
        print("Updated Mounish to Admin")
    
    # Dharshan -> Brand Manager
    u_bm = User.query.filter_by(role='Brand Manager').first()
    if u_bm:
        u_bm.name = 'Dharshan'
        print("Updated Brand Manager name to Dharshan")
    else:
        # Create if not exists? User might have it. 
        # ID 8 is Brand Manager.
        u8 = User.query.get(8)
        if u8:
            u8.name = 'Dharshan'
            print("Updated ID 8 name to Dharshan")

    db.session.commit()
