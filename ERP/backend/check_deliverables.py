from app import create_app
from app.models.automation import MonthlyDeliverable
from app.extensions import db

app = create_app()
with app.app_context():
    print("--- Monthly Deliverables ---")
    rows = MonthlyDeliverable.query.all()
    for r in rows:
        print(f"ID: {r.id}, Client: {r.client_id}, Activity: {r.activity_type_id}, Month: {r.month}, Year: {r.year}, Target: {r.monthly_target}, Done: {r.completed_count}")
