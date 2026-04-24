from app import create_app, db
from app.models.user import User

app = create_app()
with app.app_context():
    print("--- User Renaming Migration (Kowshik -> Kousic) ---")
    
    # Try finding by email first
    users = User.query.filter(
        (User.email == 'kowshik@reachskyline.com') | 
        (User.name.ilike('%kowshik%'))
    ).all()
    
    if not users:
        print("No users found matching 'Kowshik' or 'kowshik@reachskyline.com'.")
    else:
        for u in users:
            old_name = u.name
            old_email = u.email
            
            u.name = 'Kousic'
            u.email = 'kousic@reachskyline.com'
            u.set_password('Kousic@123')
            
            print(f"Updated: {old_name} ({old_email}) -> Kousic (kousic@reachskyline.com)")
        
        db.session.commit()
        print("\n✅ Migration complete!")
