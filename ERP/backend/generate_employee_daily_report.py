from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask
from app.models.user import User
from sqlalchemy import func
from datetime import date

app = create_app()
with app.app_context():
    # We want tasks grouped by work_date (or falling back to assigned_date) and employee_id
    # We'll use March 2026 as per the previous scripts
    year = 2026
    month = 3
    
    # Query: Date, Employee Name, Task Count
    # Using coalesce to handle work_date if it's null (fallback to assigned_date)
    q = db.session.query(
        func.coalesce(AutomationTask.work_date, AutomationTask.assigned_date).label('task_date'),
        User.name,
        func.count(AutomationTask.id)
    ).join(User, db.or_(
        AutomationTask.assigned_employee_id == User.id,
        AutomationTask.video_editor_id == User.id
    )).filter(
        AutomationTask.month == month,
        AutomationTask.year == year
    ).group_by('task_date', User.id).order_by('task_date', User.name).all()

    report_file = 'employee_daily_tasks_march.txt'
    with open(report_file, 'w') as f:
        f.write(f"{'DATE':<15} | {'EMPLOYEE NAME':<30} | {'TASK COUNT'}\n")
        f.write("-" * 65 + "\n")
        
        current_date = None
        for t_date, e_name, count in q:
            if t_date != current_date:
                if current_date is not None:
                    f.write("-" * 65 + "\n")
                current_date = t_date
            
            date_str = t_date.isoformat() if t_date else "N/A"
            f.write(f"{date_str:<15} | {e_name:<30} | {count}\n")
            
    print(f"Report generated: {report_file}")
