from app import create_app, db
from app.models.automation import AutomationTask, ActivityLog, AutomationRoughCut
import json

app = create_app()
with app.app_context():
    task = AutomationTask.query.filter_by(activity_code='633YTS1').first()
    if task:
        print(f"Task ID: {task.id}")
        print(f"Activity Code: {task.activity_code}")
        print(f"Status: {task.status}")
        print(f"Rough Cut Path: {task.rough_cut_video_path}")
        print(f"Submission Title: {task.submission_title}")
        
        print("\nChecking linked Rough Cut assignments:")
        rcs = AutomationRoughCut.query.filter_by(target_task_id=task.id).all()
        for rc in rcs:
            print(f"RC ID: {rc.id}, Status: {rc.status}, Edited Path: {rc.edited_video_path}")

        print("\nRecent Logs for this task:")
        # Look for the log model to confirm the field name, but let's try common ones
        logs = ActivityLog.query.filter_by(task_id=task.id).order_by(ActivityLog.id.desc()).limit(15).all()
        for log in logs:
            try:
                date_str = log.created_at.strftime('%Y-%m-%d %H:%M:%S')
            except AttributeError:
                date_str = "Unknown Date"
            print(f"{date_str}: {log.action} - {log.details}")
    else:
        print("Task 633YTS1 not found.")
