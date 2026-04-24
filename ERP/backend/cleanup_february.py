from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask, MonthlyDeliverable, EmployeeDailyMinutes, AutomationJobWork, TaskApproval
from sqlalchemy import text
from datetime import date

app = create_app()

def cleanup():
    with app.app_context():
        print("=== Step 1: Cleaning up February 2026 tasks ===")
        # We delete all tasks assigned in Feb 2026
        feb_tasks = AutomationTask.query.filter(
            AutomationTask.assigned_date >= date(2026, 2, 1),
            AutomationTask.assigned_date <= date(2026, 2, 28)
        ).all()
        
        task_ids = [t.id for t in feb_tasks]
        if task_ids:
            # Delete approvals first due to FK
            TaskApproval.query.filter(TaskApproval.task_id.in_(task_ids)).delete(synchronize_session=False)
            # Delete tasks
            count = len(task_ids)
            AutomationTask.query.filter(AutomationTask.id.in_(task_ids)).delete(synchronize_session=False)
            print(f"  ✓ Deleted {count} tasks from February 2026")
        else:
            print("  ✓ No February 2026 tasks found")

        print("\n=== Step 2: Resetting Monthly Deliverable completed_count ===")
        # Reset all MonthlyDeliverables completed_count to 0 for Feb and March 2026
        # Or more accurately, recount them from remaining tasks if any exist (but we just deleted Feb ones)
        deliverables = MonthlyDeliverable.query.filter(
            MonthlyDeliverable.year == 2026,
            MonthlyDeliverable.month.in_([2, 3])
        ).all()
        
        for d in deliverables:
            # Count actual completed tasks for this deliverable
            actual_completed = AutomationTask.query.filter_by(
                client_id=d.client_id,
                activity_type_id=d.activity_type_id,
                month=d.month,
                year=d.year,
                status='completed'
            ).count()
            d.completed_count = actual_completed
            print(f"  ~ {d.client_id} | {d.month}/2026: completed_count set to {actual_completed}")

        print("\n=== Step 3: Resetting Employee used_minutes for Today ===")
        today = date.today()
        daily_mins = EmployeeDailyMinutes.query.filter_by(date=today).all()
        for rec in daily_mins:
            # Recalculate used minutes based on actual tasks assigned today
            actual_used = db.session.query(db.func.sum(AutomationTask.minutes_required)).filter(
                AutomationTask.assigned_employee_id == rec.employee_id,
                AutomationTask.assigned_date == today
            ).scalar() or 0
            rec.used_minutes = actual_used
            print(f"  ~ Employee {rec.employee_id}: used_minutes set to {actual_used}")

        print("\n=== Step 4: Resetting Job Work statuses if tasks were deleted ===")
        # If any job work was 'assigned' but their task was deleted, set back to 'pending'
        job_works = AutomationJobWork.query.filter_by(status='assigned').all()
        for jw in job_works:
            has_task = AutomationTask.query.filter_by(job_work_id=jw.id).first()
            if not has_task:
                jw.status = 'pending'
                print(f"  ~ Job Work {jw.id} reset to pending")

        db.session.commit()
        print("\n✅ Cleanup completed successfully.")

if __name__ == '__main__':
    cleanup()
