from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask

app = create_app()
with app.app_context():
    tasks = AutomationTask.query.all()
    print(f"Total tasks: {len(tasks)}")
    for t in tasks:
        print(f"ID: {t.id}, Code: {t.activity_code}, Status: {t.status}")
