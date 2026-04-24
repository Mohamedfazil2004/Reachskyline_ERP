# NOTE: Import errors reported by the linter here are typically due to environment configuration.
# This script has been verified to run correctly in the backend directory.
import sys
import os
# Ensure the backend directory is in the path for engine/model imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import create_app  # type: ignore
from app.models.automation import MonthlyDeliverable, AutomationTask  # type: ignore
from app.extensions import db  # type: ignore


app = create_app()
with app.app_context():
    print("--- Summary (March 2026) ---")
    mar_deliv = MonthlyDeliverable.query.filter_by(month=3, year=2026).count()
    print(f"Mar Deliverables types: {mar_deliv}")
    
    tasks_count = AutomationTask.query.filter_by(month=3, year=2026).count()
    completed_count = AutomationTask.query.filter_by(month=3, year=2026, status='Completed').count()
    print(f"Total Mar Tasks: {tasks_count}")
    print(f"Completed Mar Tasks: {completed_count}")
    
    if tasks_count > 0:
        latest_tasks = AutomationTask.query.filter_by(month=3, year=2026).order_by(AutomationTask.id.desc()).limit(10).all()
        print("\nLatest 10 tasks for March:")
        for t in latest_tasks:
            emp_name = t.assigned_employee.name if t.assigned_employee else "Unassigned"
            print(f"ID: {t.id}, Code: {t.activity_code}, Emp: {emp_name}, Status: {t.status}")
