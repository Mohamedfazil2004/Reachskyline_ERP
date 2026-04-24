import os
from app import create_app, db
from app.models.automation import AutomationTask
from app.models.user import User

app = create_app()
with app.app_context():
    # Find user 'rajaguru'
    editor = User.query.filter(User.name.ilike('%rajaguru%')).first()
    if not editor:
        print("Rajaguru not found")
    else:
        print(f"Found editor: {editor.name} (ID: {editor.id})")
        # Find tasks assigned to him in video_editing or brand_manager_video_review stage
        tasks = AutomationTask.query.filter(
            AutomationTask.video_editor_id == editor.id
        ).order_by(AutomationTask.id.desc()).limit(10).all()
        
        for t in tasks:
            print(f"Task: {t.id} Code: {t.activity_code} Status: {t.status} Stage: {t.current_stage}")
            print(f"  Final Video: {t.final_video_path}")
            print(f"  Final Thumbnail: {t.final_thumbnail_path}")
            print(f"  Editor Notes: {t.editor_notes}")
            print("-" * 20)
