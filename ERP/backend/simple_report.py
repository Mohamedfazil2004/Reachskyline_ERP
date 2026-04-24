from app import create_app
from app.models.automation import AutomationTask
from app.models.master import Client, ActivityType
from app.extensions import db
from sqlalchemy import func

app = create_app()
with app.app_context():
    # Use simple loop to print results if output is being truncated
    results = db.session.query(
        Client.name,
        ActivityType.name,
        func.count(AutomationTask.id)
    ).join(Client, AutomationTask.client_id == Client.id)\
     .join(ActivityType, AutomationTask.activity_type_id == ActivityType.id)\
     .filter(AutomationTask.month == 3, AutomationTask.year == 2026)\
     .group_by(Client.name, ActivityType.name)\
     .all()

    print("CLIENT_NAME | ACTIVITY_NAME | TASK_COUNT")
    for client_name, at_name, count in results:
        print(f"{client_name} | {at_name} | {count}")
    
    print(f"TOTAL_TASKS: {len(results)}")
