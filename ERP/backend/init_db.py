import sys
import os

# Add the current directory to sys.path for importing app
sys.path.append(os.getcwd())

from app import create_app
from app.extensions import db
# Import all models to ensure they are registered with SQLAlchemy
from app.models.user import User
from app.models.master import Client, ActivityType, SystemSetting
from app.models.workflow import MonthlyPlan, Deliverable, JobWork, Shoot
from app.models.automation import MonthlyDeliverable, EmployeeDailyMinutes, AutomationJobWork, Attendance, AutomationTask, TaskApproval, ActivityLog, AutomationRoughCut
from app.models.work_record import WorkRecord

app = create_app()

def init_db():
    with app.app_context():
        db.create_all()
        print("Database tables initialized successfully.")

if __name__ == "__main__":
    init_db()
