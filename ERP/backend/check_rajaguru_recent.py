import os
from app import create_app, db
from app.models.automation import AutomationTask, ActivityLog
from app.models.user import User
from datetime import date, datetime

app = create_app()
with app.app_context():
    # Find user 'rajaguru'
    editor = User.query.filter(User.name.ilike('%rajaguru%')).first()
    if not editor:
        with open("rajaguru_recent_report.txt", "w", encoding="utf-8") as f:
            f.write("Rajaguru not found")
        exit()
    
    user_id = editor.id
    output = []
    output.append(f"Rajaguru ID: {user_id}")
    output.append(f"Rajaguru Name: {editor.name}")
    output.append(f"Rajaguru Role: {editor.role}")
    output.append(f"Rajaguru Capacity: {editor.daily_available_minutes}")
    
    # Check REcent tasks assigned to him (last 5)
    recent = AutomationTask.query.filter(
        db.or_(
            AutomationTask.assigned_employee_id == user_id,
            AutomationTask.video_editor_id == user_id
        )
    ).order_by(AutomationTask.id.desc()).limit(15).all()
    
    output.append("\nRecent Tasks for Rajaguru:")
    for t in recent:
        output.append(f"Task ID: {t.id} Code: {t.activity_code}")
        output.append(f"  Stage: {t.current_stage} Status: {t.status}")
        output.append(f"  Assigned Date: {t.assigned_date}")
        output.append(f"  Minutes (Writer): {t.activity_type.activity_time if t.activity_type else 'N/A'}")
        output.append(f"  Minutes (Editor): {t.activity_type.editor_minutes if t.activity_type else 'N/A'}")
        output.append(f"  Total Visibility Time: {t.calculate_total_time}")
        output.append(f"  Priority: {t.priority}")
        output.append(f"  Assignment Time: {t.assignment_time}")
        output.append("-" * 20)
    
    # Search for rajaguru in logs
    logs = ActivityLog.query.filter(ActivityLog.details.ilike('%rajaguru%')).order_by(ActivityLog.id.desc()).limit(15).all()
    output.append("\nRecent Logs mentioning Rajaguru:")
    for l in logs:
        output.append(f"Log ID: {l.id} User: {l.user_id} Action: {l.action}")
        output.append(f"  Details: {l.details}")
        output.append(f"  Created At: {l.created_at}")
        output.append("-" * 20)

    with open("rajaguru_recent_report.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output))
