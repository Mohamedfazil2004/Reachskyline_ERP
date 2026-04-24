from app import create_app
from app.models.master import ActivityType
from app.extensions import db

app = create_app()
with app.app_context():
    rows = ActivityType.query.all()
    print("--- Activity Types ---")
    for r in rows:
        print(f"ID: {r.id}, Code: {r.code_id}, Name: {r.name}, Writer Mins: {r.writer_minutes}, Editor Mins: {r.editor_minutes}")
