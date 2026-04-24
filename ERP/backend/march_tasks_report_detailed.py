from app import create_app
from app.models.automation import AutomationTask
from app.models.master import Client, ActivityType
from app.extensions import db
from sqlalchemy import func

app = create_app()
with app.app_context():
    print("=== Detailed March 2026 Tasks Report ===")
    
    # query with joins
    results = db.session.query(
        Client.name.label('client_name'),
        ActivityType.name.label('activity_name'),
        func.count(AutomationTask.id).label('count')
    ).join(Client, AutomationTask.client_id == Client.id)\
     .join(ActivityType, AutomationTask.activity_type_id == ActivityType.id)\
     .filter(AutomationTask.month == 3, AutomationTask.year == 2026)\
     .group_by(Client.name, ActivityType.name)\
     .order_by(Client.name)\
     .all()

    if not results:
        print("No tasks found for March 2026.")
    else:
        print(f"{'Client Name':<35} | {'Activity Name':<30} | {'Count':<5}")
        print("-" * 75)
        for row in results:
            print(f"{row.client_name[:35]:<35} | {row.activity_name[:30]:<30} | {row.count:<5}")
            
    total_march = AutomationTask.query.filter_by(month=3, year=2026).count()
    print("-" * 75)
    print(f"TOTAL MARCH TASKS: {total_march}")
