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
        ).order_by(AutomationTask.id.desc()).limit(1).all()
        
        for t in tasks:
            print(f"Task ID: {t.id}")
            print(f"Code: {t.activity_code}")
            print(f"Status: {t.status}")
            print(f"Final Video: {t.final_video_path}")
            print(f"Final Thumbnail: {t.final_thumbnail_path}")
            
            # Since the editor likely uploaded a thumbnail, let's see if we can find it in the uploads folder
            # or if it was somehow stored elsewhere. Actually, if it wasn't saved, it's not in the DB.
