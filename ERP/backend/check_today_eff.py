from app.extensions import db
from app import create_app
from app.models.automation import AutomationTask
from datetime import date

app = create_app()
with app.app_context():
    today = date(2026, 3, 2)
    tasks = AutomationTask.query.filter(AutomationTask.status.in_(['Submitted to BM', 'Video Submitted', 'Completed'])).all()
    print("ID | Code | Status | Work Date | Assigned Date")
    for t in tasks:
        if t.work_date == today or t.assigned_date == today:
             print(f"{t.id} | {t.activity_code} | {t.status} | {t.work_date} | {t.assigned_date}")
