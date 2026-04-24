from app import create_app
from app.models.work_record import WorkRecord
from sqlalchemy import func

app = create_app()
with app.app_context():
    count_21 = WorkRecord.query.filter_by(user_id=21).count()
    count_16 = WorkRecord.query.filter_by(user_id=16).count()
    count_14 = WorkRecord.query.filter_by(user_id=14).count()
    count_15 = WorkRecord.query.filter_by(user_id=15).count()
    
    # Check for Mounish (if created)
    from app.models.user import User
    mounish = User.query.filter_by(email="mounish@skyline.com").first()
    count_mounish = WorkRecord.query.filter_by(user_id=mounish.id).count() if mounish else 0
    
    print(f"Records for Mathesh (ID 21, reachskyline): {count_21}")
    print(f"Records for Mathesh (ID 16, skyline): {count_16}")
    print(f"Records for Sasi (ID 14, skyline): {count_14}")
    print(f"Records for Swetha (ID 15, skyline): {count_15}")
    print(f"Records for Mounish (Email: mounish@skyline.com): {count_mounish}")
    
    if count_21 > 0:
        latest = WorkRecord.query.filter_by(user_id=21).order_by(WorkRecord.date.desc()).first()
        print(f"Latest record for ID 21: {latest.date} - {latest.work_description[:50]}")
