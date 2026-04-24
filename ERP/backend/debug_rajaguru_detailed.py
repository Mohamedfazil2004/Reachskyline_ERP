import os
from app import create_app, db
from app.models.automation import AutomationTask
from app.models.user import User
from datetime import date, datetime

app = create_app()
with app.app_context():
    # Find user 'rajaguru'
    editor = User.query.filter(User.name.ilike('%rajaguru%')).first()
    if not editor:
        print("Rajaguru not found")
        exit()
    
    user_id = editor.id
    output = []
    output.append(f"Found editor: {editor.name} (ID: {user_id})")
    
    # Find ALL tasks assigned to him (Writer or Editor)
    all_tasks = AutomationTask.query.filter(
        db.or_(
            AutomationTask.assigned_employee_id == user_id,
            AutomationTask.video_editor_id == user_id
        )
    ).all()
    
    output.append(f"Total tasks associated: {len(all_tasks)}")
    
    for t in all_tasks:
        output.append(f"Task ID: {t.id} Code: {t.activity_code}")
        output.append(f"  Stage: {t.current_stage} Status: {t.status}")
        output.append(f"  Assigned Date: {t.assigned_date}")
        output.append(f"  Writer ID: {t.assigned_employee_id} Editor ID: {t.video_editor_id}")
        output.append(f"  Priority: {t.priority} Source: {t.source}")
        output.append(f"  Work Date: {t.work_date}")
        output.append("-" * 20)

    # Check for blocking day logic specifically
    target_date = date(2026, 3, 5)
    
    writer_done_statuses = ['Assigned to Editor', 'Video Submitted', 'Completed', 'Done']
    editor_done_statuses = ['Completed', 'Done']

    def is_employee_done(t, uid):
        is_writer = t.assigned_employee_id == uid
        is_editor = t.video_editor_id == uid
        writer_done = is_writer and t.status in writer_done_statuses
        editor_done = is_editor and t.status in editor_done_statuses
        if is_writer and is_editor:
             return writer_done and editor_done
        return writer_done or editor_done

    past_incomplete = []
    for t in all_tasks:
        if t.assigned_date and t.assigned_date < target_date:
            if not is_employee_done(t, user_id):
                past_incomplete.append(t)
    
    output.append(f"Past incomplete tasks: {len(past_incomplete)}")
    for t in past_incomplete:
        output.append(f"  Blocking Task: {t.id} ({t.activity_code}) Date: {t.assigned_date} Status: {t.status}")

    # Check for today's tasks
    today_tasks = [t for t in all_tasks if t.assigned_date == target_date]
    output.append(f"Today's tasks: {len(today_tasks)}")
    for t in today_tasks:
        output.append(f"  Today Task: {t.id} ({t.activity_code}) Status: {t.status}")

    with open("detailed_rajaguru_debug.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output))
