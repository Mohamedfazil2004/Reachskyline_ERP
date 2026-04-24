from app import create_app
from app.models.automation import AutomationRoughCut, AutomationTask
from app.models.user import User

app = create_app()
with app.app_context():
    rcs = AutomationRoughCut.query.filter_by(editor_id=11).all()
    print(f"Rough Cuts for Rajaguru (11): {len(rcs)}")
    for rc in rcs:
        print(f"ID: {rc.id}, Status: {rc.status}, Created: {rc.created_at}, Media: {rc.media_paths[:30]}...")

    # Also check if target_task_id is set
    completed_rcs = AutomationRoughCut.query.filter_by(editor_id=11, status='Completed').all()
    print(f"\nCompleted Rough Cuts today for Rajaguru (11):")
    for rc in completed_rcs:
        print(f"ID: {rc.id}, Target Task ID: {rc.target_task_id}, Edited Path: {rc.edited_video_path}")
