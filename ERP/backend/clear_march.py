from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask, MonthlyDeliverable

app = create_app()
with app.app_context():
    print("=== Cleaning up March 2026 Tasks ===")
    
    # Delete all tasks for March 2026
    deleted_count = AutomationTask.query.filter_by(month=3, year=2026).delete()
    
    # Also reset the completed counts in MonthlyDeliverable for March
    deliverables = MonthlyDeliverable.query.filter_by(month=3, year=2026).all()
    for d in deliverables:
        d.completed_count = 0
    
    db.session.commit()
    print(f"Successfully deleted {deleted_count} tasks and reset March deliverables.")
