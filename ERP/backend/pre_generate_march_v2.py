import os
import calendar
from datetime import date, datetime
from app import create_app
from app.extensions import db
from app.models.automation import (
    MonthlyDeliverable, EmployeeDailyMinutes,
    AutomationTask, AutomationJobWork
)
from app.models.master import Client, ActivityType
from app.models.user import User

app = create_app()

def _assign_to_best_writer(writer_mins, mins_needed):
    best = None
    best_remaining = -1
    for wid, info in writer_mins.items():
        if info['remaining'] >= mins_needed and info['remaining'] > best_remaining:
            best = info
            best_remaining = info['remaining']
    return best

def generate_activity_code(client_id, activity_type_id, year, month):
    at = ActivityType.query.get(activity_type_id)
    if not at: return "UNK"
    year_digit  = str(year)[-1]
    client_num  = int(client_id.replace('C', '').replace('c', ''))
    existing_count = AutomationTask.query.filter_by(
        client_id=client_id, activity_type_id=activity_type_id,
        month=month, year=year
    ).count()
    seq = existing_count + 1
    return f"{year_digit}{month}{client_num}{at.code_letter}{seq}"

def get_or_create_daily_minutes(emp_id, target_date):
    rec = EmployeeDailyMinutes.query.filter_by(employee_id=emp_id, date=target_date).first()
    if not rec:
        emp = User.query.get(emp_id)
        default_mins = 240 if (emp and 'Part-Time' in (emp.role or '')) else 480
        rec = EmployeeDailyMinutes(employee_id=emp_id, date=target_date,
                                   available_minutes=default_mins, used_minutes=0)
        db.session.add(rec)
        db.session.flush()
    return rec

def run_generation(target_date):
    month = target_date.month
    year = target_date.year
    
    # 1. Writers
    writers = User.query.filter(User.role.in_(['Content Writer']), User.is_active == True).all()
    writer_mins = {}
    for w in writers:
        rec = get_or_create_daily_minutes(w.id, target_date)
        actual_used = db.session.query(db.func.sum(AutomationTask.minutes_required)).filter(
            AutomationTask.assigned_employee_id == w.id,
            AutomationTask.assigned_date == target_date
        ).scalar() or 0
        rec.used_minutes = actual_used
        remaining = rec.available_minutes - rec.used_minutes
        if remaining > 0:
            writer_mins[w.id] = {'employee': w, 'rec': rec, 'remaining': remaining}

    tasks_created = []

    # 2. Monthly Deliverables
    deliverables = MonthlyDeliverable.query.filter_by(month=month, year=year).all()
    deliv_with_remaining = []
    for d in deliverables:
        actual_assigned_count = AutomationTask.query.filter_by(
            client_id=d.client_id, activity_type_id=d.activity_type_id,
            month=month, year=year
        ).count()
        rem = d.monthly_target - actual_assigned_count
        if rem > 0:
            deliv_with_remaining.append({'obj': d, 'rem': rem})

    deliv_with_remaining.sort(key=lambda x: x['rem'], reverse=True)
    
    total_days = calendar.monthrange(year, month)[1]
    today_day  = target_date.day
    remaining_workdays = max(1, total_days - today_day + 1)

    for item in deliv_with_remaining:
        deliv = item['obj']
        remaining_tasks = item['rem']
        at = ActivityType.query.get(deliv.activity_type_id)
        if not at: continue

        daily_quota = max(1, round(remaining_tasks / remaining_workdays))
        mins = at.writer_minutes

        for _ in range(daily_quota):
            current_count = AutomationTask.query.filter_by(
                client_id=deliv.client_id, activity_type_id=deliv.activity_type_id,
                month=month, year=year
            ).count()
            if current_count >= deliv.monthly_target: break

            assigned = _assign_to_best_writer(writer_mins, mins)
            if not assigned: break
                
            code = generate_activity_code(deliv.client_id, deliv.activity_type_id, year, month)
            task = AutomationTask(
                activity_code=code, client_id=deliv.client_id, activity_type_id=deliv.activity_type_id,
                assigned_employee_id=assigned['employee'].id, assigned_date=target_date,
                month=month, year=year, current_stage='content_writing', status='pending',
                priority=3, source='monthly', minutes_required=mins
            )
            db.session.add(task)
            assigned['rec'].used_minutes += mins
            assigned['remaining'] -= mins
            tasks_created.append(code)

    db.session.commit()
    print(f"Generated {len(tasks_created)} tasks for {target_date}")

if __name__ == '__main__':
    with app.app_context():
        print("Starting pre-generation for March 1-5...")
        for day in range(1, 6):
            run_generation(date(2026, 3, day))
        print("Done!")
