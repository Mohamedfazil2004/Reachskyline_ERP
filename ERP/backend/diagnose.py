"""Directly test automation functions to find the 500 error"""
from app import create_app
from app.extensions import db
from app.models.automation import MonthlyDeliverable, AutomationTask, AutomationJobWork
from datetime import date
import traceback

app = create_app()
with app.app_context():
    today = date.today()
    month = today.month
    year = today.year
    
    print("=== Testing stats components ===")
    
    try:
        total_deliverables = db.session.query(db.func.sum(MonthlyDeliverable.monthly_target)).filter_by(
            month=month, year=year).scalar() or 0
        print(f"  total_deliverables: {total_deliverables}")
    except Exception as e:
        print(f"  ERROR total_deliverables: {e}")
        traceback.print_exc()
    
    try:
        total_completed = db.session.query(db.func.sum(MonthlyDeliverable.completed_count)).filter_by(
            month=month, year=year).scalar() or 0
        print(f"  total_completed: {total_completed}")
    except Exception as e:
        print(f"  ERROR total_completed: {e}")
        traceback.print_exc()

    try:
        today_tasks = AutomationTask.query.filter_by(assigned_date=today).count()
        print(f"  today_tasks: {today_tasks}")
    except Exception as e:
        print(f"  ERROR today_tasks: {e}")
        traceback.print_exc()
    
    try:
        pending_approval = AutomationTask.query.filter_by(status='waiting_approval').count()
        print(f"  pending_approval: {pending_approval}")
    except Exception as e:
        print(f"  ERROR pending_approval: {e}")
        traceback.print_exc()
    
    try:
        rework_count = AutomationTask.query.filter_by(status='rework').count()
        print(f"  rework_count: {rework_count}")
    except Exception as e:
        print(f"  ERROR rework_count: {e}")
        traceback.print_exc()
    
    try:
        pending_jw = AutomationJobWork.query.filter_by(status='pending').count()
        print(f"  pending_jw: {pending_jw}")
    except Exception as e:
        print(f"  ERROR pending_jw: {e}")
        traceback.print_exc()

    print("\n=== Testing generate tasks ===")
    from app.models.user import User
    from app.models.master import ActivityType
    from app.routes.automation import generate_activity_code, get_or_create_daily_minutes
    import calendar

    try:
        writers = User.query.filter(User.role.in_(['Content Writer']), User.is_active == True).all()
        print(f"  Content writers: {[w.name for w in writers]}")
    except Exception as e:
        print(f"  ERROR writers: {e}")
        traceback.print_exc()
    
    try:
        deliverables = MonthlyDeliverable.query.filter_by(month=month, year=year).all()
        print(f"  Deliverables for {month}/{year}: {len(deliverables)}")
    except Exception as e:
        print(f"  ERROR deliverables: {e}")
        traceback.print_exc()

    print("\n=== Testing nullslast order ===")
    try:
        # This is the problematic query
        from sqlalchemy import asc, nullslast
        pending_jw_list = AutomationJobWork.query.filter_by(status='pending').order_by(
            nullslast(asc(AutomationJobWork.deadline))
        ).all()
        print(f"  Job work (nullslast): {len(pending_jw_list)}")
    except Exception as e:
        print(f"  ERROR nullslast: {e}")
        traceback.print_exc()

    print("\nAll tests complete!")
