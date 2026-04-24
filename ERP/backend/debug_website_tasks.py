from app import create_app
from app.models.website_team import WebsiteActivity, WebsiteTask
from app.models.user import User
from app.extensions import db

app = create_app()
with app.app_context():
    # Check all website tasks on Mar 7
    tasks = WebsiteTask.query.filter_by(date='2026-03-07').all()
    print(f"--- All Website Tasks on 2026-03-07 ({len(tasks)}) ---")
    for t in tasks:
        user = User.query.get(t.assigned_to)
        print(f"ID: {t.id} | User: {user.name} (ID: {user.id}) | Status: {t.status} | Desc: {t.task_description[:40]}")

    # Check specifically for Kousic (18)
    k_tasks = WebsiteTask.query.filter_by(assigned_to=18, date='2026-03-07').all()
    print(f"\n--- Kousic (18) Tasks on 2026-03-07 ({len(k_tasks)}) ---")
    for t in k_tasks:
        print(f"ID: {t.id} | Status: {t.status} | Desc: {t.task_description[:40]}")
