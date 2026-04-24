import os
from app import create_app, db
from app.models.automation import AutomationTask, ActivityLog
from app.models.user import User

app = create_app()
with app.app_context():
    # Find recent logs
    logs = ActivityLog.query.order_by(ActivityLog.id.desc()).limit(20).all()
    for l in logs:
        print(f"Log ID: {l.id} Task ID: {l.automation_task_id} Action: {l.action} Time: {l.created_at}")
        t = AutomationTask.query.get(l.automation_task_id)
        if t:
            print(f"  Task Code: {t.activity_code} Final Video: {t.final_video_path}")
        print("-" * 20)
