from app import create_app, db
from app.models.automation import AutomationTask, AutomationRoughCut

app = create_app()
with app.app_context():
    # 1. Find the target task
    task = AutomationTask.query.filter_by(activity_code='633YTS1').first()
    
    if task:
        print(f"Repairing Task: {task.activity_code} (ID: {task.id})")
        
        # 2. Find the Rough Cut that should be linked to it
        # Based on previous check, RC 1 had a path but maybe the link was broken or the task didn't save it
        rc = AutomationRoughCut.query.get(1)
        
        if rc and rc.edited_video_path:
            print(f"Found Video Path in RC {rc.id}: {rc.edited_video_path}")
            
            # 3. Restore the path to the task
            task.rough_cut_video_path = rc.edited_video_path
            
            # 4. Link the RC to the task correctly if not already done
            rc.target_task_id = task.id
            rc.status = 'Completed'
            
            db.session.commit()
            print("✅ RESTORED: Edited video path has been placed back into the task.")
        else:
            print("Could not find the video path in the Rough Cut record.")
    else:
        print("Task 633YTS1 not found.")
