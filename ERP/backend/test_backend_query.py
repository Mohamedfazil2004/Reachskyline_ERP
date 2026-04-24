from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask
from app.models.user import User

app = create_app()
with app.app_context():
    # Simulate user 6 (Sri)
    user_id = 6
    active_statuses = [
        'Pending', 'Assigned', 'In Progress', 'Assigned to Editor', 
        'Rework Required (Writer)', 'Rework Required (Editor)',
        'Submitted to BM', 'Video Submitted', 'Completed'
    ]
    
    tasks = AutomationTask.query.filter(
        db.or_(
            AutomationTask.assigned_employee_id == user_id,
            AutomationTask.video_editor_id == user_id
        ),
        AutomationTask.status.in_(active_statuses)
    ).all()
    
    print(f"Results for User {user_id}: {len(tasks)} tasks.")
    if tasks:
        print(f"First task status: '{tasks[0].status}'")
        print(f"To Dict output keys: {tasks[0].to_dict().keys()}")
        print(f"To Dict status: {tasks[0].to_dict()['status']}")
