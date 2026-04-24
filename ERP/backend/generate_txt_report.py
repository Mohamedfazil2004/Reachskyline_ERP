from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask
from app.models.master import Client, ActivityType
from sqlalchemy import func

app = create_app()
with app.app_context():
    q = db.session.query(
        Client.name,
        ActivityType.name,
        func.count(AutomationTask.id)
    ).join(Client).join(ActivityType).filter(
        AutomationTask.month == 3,
        AutomationTask.year == 2026
    ).group_by(Client.name, ActivityType.name).order_by(Client.name).all()

    with open('march_report_final.txt', 'w') as f:
        f.write(f"{'CLIENT NAME':<35} | {'ACTIVITY NAME':<30} | {'TASK COUNT'}\n")
        f.write("-" * 80 + "\n")
        for c_name, a_name, count in q:
            f.write(f"{c_name:<35} | {a_name:<30} | {count}\n")
        
        total = AutomationTask.query.filter_by(month=3, year=2026).count()
        f.write("-" * 80 + "\n")
        f.write(f"TOTAL TASKS ASSIGNED IN MARCH: {total}\n")
