from app import create_app
from app.models.automation import AutomationTask
from app.extensions import db
from sqlalchemy import func

app = create_app()
with app.app_context():
    print("=== March 2026 Tasks Summary ===")
    
    # Group by client and activity type
    results = db.session.query(
        AutomationTask.client_id,
        AutomationTask.activity_type_id,
        func.count(AutomationTask.id).label('count')
    ).filter(
        AutomationTask.month == 3,
        AutomationTask.year == 2026
    ).group_by(
        AutomationTask.client_id,
        AutomationTask.activity_type_id
    ).all()

    if not results:
        print("No tasks found for March 2026.")
    else:
        print(f"{'Client Name':<35} | {'Activity Name':<30} | {'Count':<5}")
        print("-" * 75)
        for client_id, at_id, count in results:
            from app.models.master import Client, ActivityType
            client = Client.query.get(client_id)
            at = ActivityType.query.get(at_id)
            client_name = client.name if client else "Unknown Client"
            at_name = at.name if at else "Unknown Activity"
            print(f"{client_name[:35]:<35} | {at_name[:30]:<30} | {count:<5}")
            
    total_march = AutomationTask.query.filter_by(month=3, year=2026).count()
    print("-" * 75)
    print(f"TOTAL MARCH TASKS: {total_march}")
