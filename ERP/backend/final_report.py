from app import create_app
from app.models.automation import AutomationTask
from app.models.master import Client, ActivityType
from app.extensions import db
from sqlalchemy import func

app = create_app()
with app.app_context():
    # Final attempt to get clean output
    query = db.session.query(
        Client.name,
        ActivityType.name,
        func.count(AutomationTask.id)
    ).join(Client, AutomationTask.client_id == Client.id)\
     .join(ActivityType, AutomationTask.activity_type_id == ActivityType.id)\
     .filter(AutomationTask.month == 3, AutomationTask.year == 2026)\
     .group_by(Client.name, ActivityType.name)\
     .all()

    output = []
    output.append("=== MARCH 2026 TASK BOARD SUMMARY ===")
    output.append(f"{'CLIENT NAME':<35} | {'ACTIVITY NAME':<30} | {'COUNT'}")
    output.append("-" * 75)
    
    for c_name, a_name, count in query:
        output.append(f"{c_name[:35]:<35} | {a_name[:30]:<30} | {count}")
    
    total = AutomationTask.query.filter_by(month=3, year=2026).count()
    output.append("-" * 75)
    output.append(f"TOTAL TASKS ASSIGNED IN MARCH: {total}")
    
    for line in output:
        print(line)
