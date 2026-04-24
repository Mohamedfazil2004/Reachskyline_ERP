from app import create_app
from app.extensions import db
from app.models.automation import AutomationRoughCut
from datetime import date, datetime

app = create_app()
with app.app_context():
    # Fix Rajaguru's rough cut delivered today
    rc = AutomationRoughCut.query.get(2)
    if rc:
        rc.work_date = date.today()
        rc.completed_at = datetime.utcnow()
        rc.status = 'Completed'
        print(f"Fixed RC ID {rc.id} for Rajaguru. Work date set to {rc.work_date}")
        db.session.commit()
