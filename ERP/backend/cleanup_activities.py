from app import create_app
from app.extensions import db
from app.models.master import ActivityType

app = create_app()
with app.app_context():
    names_to_remove = ["Card Design", "Flyer", "Banner"]
    
    for name in names_to_remove:
        # Using filter instead of delete() directly to handle potential multiple entries or absence gracefully
        ats = ActivityType.query.filter_by(name=name).all()
        for at in ats:
            db.session.delete(at)
            print(f"Removed activity type: {at.code_id} - {at.name}")
    
    db.session.commit()
    print("Cleanup complete.")
