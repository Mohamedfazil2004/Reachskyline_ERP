from app import create_app
from app.models.automation import MonthlyDeliverable, AutomationTask
from app.models.user import User
from app.models.master import ActivityType
from app.extensions import db
import calendar
from datetime import date

app = create_app()

with app.app_context():
    # Minutes
    deliverables = MonthlyDeliverable.query.filter_by(month=3, year=2026).all()
    total_writer_minutes = 0
    for d in deliverables:
        at = ActivityType.query.get(d.activity_type_id)
        if at: total_writer_minutes += (d.monthly_target * at.writer_minutes)
    
    # Capacity
    # Sri (480) + Abirami (240) = 720 mins/day
    total_capacity = 720 
    
    days_needed = total_writer_minutes / total_capacity
    
    print(f"TOTAL_MINUTES: {total_writer_minutes}")
    print(f"DAILY_CAPACITY: {total_capacity}")
    print(f"DAYS_NEEDED: {days_needed:.2f}")
    
    # Verify tasks generated
    task_count = AutomationTask.query.filter(AutomationTask.month == 3).count()
    print(f"MARCH_TASKS_GENERATED: {task_count}")
