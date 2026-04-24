from app.extensions import db
from app import create_app
from app.models.automation import AutomationTask
from datetime import date

app = create_app()
with app.app_context():
    tasks = AutomationTask.query.filter(AutomationTask.assigned_date <= date(2026,3,2)).all()
    print("ID | Code | Assigned | Work | Status")
    for t in tasks:
        print(f"{t.id} | {t.activity_code} | {t.assigned_date} | {t.work_date} | {t.status}")
