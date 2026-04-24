from app.extensions import db
from app import create_app
from app.models.automation import AutomationTask
from datetime import date

app = create_app()
with app.app_context():
    tasks = AutomationTask.query.filter(AutomationTask.status == 'Completed').all()
    print("ID | Code | Completed At | Work Date")
    for t in tasks:
        print(f"{t.id} | {t.activity_code} | {t.completed_at} | {t.work_date}")
