from app import create_app
from app.models.automation import MonthlyDeliverable
from app.extensions import db

app = create_app()
with app.app_context():
    print("=== Migrating February Deliverables to March 2026 ===")
    feb_rows = MonthlyDeliverable.query.filter_by(month=2, year=2026).all()
    
    count = 0
    for row in feb_rows:
        # Check if already exists in March
        exists = MonthlyDeliverable.query.filter_by(
            client_id=row.client_id,
            activity_type_id=row.activity_type_id,
            month=3,
            year=2026
        ).first()
        
        if not exists:
            new_row = MonthlyDeliverable(
                client_id=row.client_id,
                activity_type_id=row.activity_type_id,
                month=3,
                year=2026,
                monthly_target=row.monthly_target,
                completed_count=0
            )
            db.session.add(new_row)
            count += 1
    
    db.session.commit()
    print(f"✅ Migrated {count} deliverables to March 2026.")
