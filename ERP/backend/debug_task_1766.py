from app import create_app, db
from app.models.automation import AutomationTask, ActivityLog
import os

app = create_app()
with app.app_context():
    task_id = 1766
    task = AutomationTask.query.get(task_id)
    if task:
        print(f"Task ID: {task.id}")
        print(f"Code: {task.activity_code}")
        print(f"Status: {task.status}")
        print(f"Editor ID: {task.video_editor_id}")
        print(f"Final Video: {task.final_video_path}")
        print(f"Final Thumbnail: {task.final_thumbnail_path}")
        
        print("\nRecent Logs for this task:")
        logs = ActivityLog.query.filter_by(task_id=task_id).order_by(ActivityLog.id.desc()).all()
        for l in logs:
            print(f" - {l.created_at}: {l.action} (User {l.user_id})")
    else:
        print(f"Task {task_id} not found")

    print("\nRecent uploads in uploads/automation:")
    upload_dir = os.path.join('uploads', 'automation')
    if os.path.exists(upload_dir):
        files = sorted(os.listdir(upload_dir), reverse=True)[:10]
        for f in files:
            print(f" - {f}")
