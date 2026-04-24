from app import create_app, db
from app.models.automation import AutomationTask, ActivityLog, AutomationRoughCut
import json

app = create_app()
with app.app_context():
    task = AutomationTask.query.filter_by(activity_code='633YTS1').first()
    if task:
        print(f"TASK_ID: {task.id}")
        print(f"CODE: {task.activity_code}")
        print(f"STATUS: {task.status}")
        print(f"ROUGH_CUT_PATH: {task.rough_cut_video_path}")
        
        print("\n--- LINKED ROUGH CUTS ---")
        rcs = AutomationRoughCut.query.filter_by(target_task_id=task.id).all()
        for rc in rcs:
            print(f"RC_ID: {rc.id} | STATUS: {rc.status} | PATH: {rc.edited_video_path}")

        print("\n--- ALL RCs FOR THIS CLIENT (Maybe wrong task linked) ---")
        # Let's find RCs that might be for this client but linked to a different task
        all_rcs = AutomationRoughCut.query.all()
        for rc in all_rcs:
            if rc.edited_video_path and '633YTS1' in (rc.target_task.activity_code if rc.target_task else ''):
                print(f"FOUND MATCH: RC {rc.id} | Task {rc.target_task.activity_code} | Path {rc.edited_video_path}")
            elif rc.status == 'Completed' and rc.edited_video_path:
                 # Just list recent completed RCs
                 pass

    else:
        print("Task 633YTS1 not found.")
