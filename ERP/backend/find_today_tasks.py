from app.extensions import db
from app import create_app
from app.models.automation import AutomationTask
from datetime import date, datetime

app = create_app()
with app.app_context():
    today = date(2026, 3, 2)
    tasks = AutomationTask.query.all()
    print("ID | Code | Status | Completed At")
    for t in tasks:
        if t.completed_at and t.completed_at.date() == today:
             print(f"{t.id} | {t.activity_code} | {t.status} | {t.completed_at}")
