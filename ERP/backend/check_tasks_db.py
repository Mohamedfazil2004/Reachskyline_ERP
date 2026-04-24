from app import create_app
from app.models.website_team import WebsiteTask
from app.models.user import User

app = create_app()
with app.app_context():
    tasks = WebsiteTask.query.filter_by(date='2026-03-07').all()
    print(f"Total website tasks on 2026-03-07: {len(tasks)}")
    for t in tasks:
        user = User.query.get(t.assigned_to)
        print(f"Task ID: {t.id}, Assigned To: {user.name} ({user.id}), Status: {t.status}, Desc: {t.task_description[:30]}")

    # Check for all tasks assigned to ID 18 (Kousic)
    k_tasks = WebsiteTask.query.filter_by(assigned_to=18).all()
    print(f"\nTotal tasks for Kousic (18): {len(k_tasks)}")
    for t in k_tasks[:10]:
        print(f"Date: {t.date}, Status: {t.status}, Desc: {t.task_description[:30]}")
