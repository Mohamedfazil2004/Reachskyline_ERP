from app.extensions import db
from app import create_app
from app.models.automation import AutomationRoughCut

app = create_app()
with app.app_context():
    db.create_all()
    print("Database tables ensured (including automation_rough_cuts)")
