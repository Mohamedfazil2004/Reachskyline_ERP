from app import create_app, db
from app.models.automation import AutomationTask
import os

app = create_app()
with app.app_context():
    tasks = AutomationTask.query.filter(
        AutomationTask.status == 'Video Submitted',
        AutomationTask.final_thumbnail_path == None
    ).all()
    
    print(f"Found {len(tasks)} tasks missing thumbnails:")
    for t in tasks:
        print(f"ID: {t.id} Code: {t.activity_code} Editor ID: {t.video_editor_id} Video: {t.final_video_path}")

    # Now let's try to match Task 1766 with the suspected thumbnail
    target_task = AutomationTask.query.get(1766)
    suspected_thumbnail = "uploads/automation/20260302_154221_ChatGPT_Image_Feb_28_2026_07_43_19_PM.png"
    
    if target_task:
        target_task.final_thumbnail_path = suspected_thumbnail
        db.session.commit()
        print(f"Successfully updated task 1766 with thumbnail: {suspected_thumbnail}")
    else:
        print("Task 1766 not found")
