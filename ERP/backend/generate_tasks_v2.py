import os
import calendar
from datetime import date, datetime, timedelta
from app import create_app
from app.extensions import db
from app.models.automation import (
    MonthlyDeliverable, EmployeeDailyMinutes,
    AutomationTask, AutomationJobWork, task_activities
)
from app.models.master import Client, ActivityType
from app.models.user import User

def generate_monthly_tasks(target_month=3, target_year=2026):
    app = create_app()
    with app.app_context():
        # Get Content Writers and their dynamic capacities
        writers = User.query.filter(User.role == 'Content Writer', User.is_active == True).all()
        if not writers:
            print("No active Content Writers found.")
            return

        total_daily_capacity = sum(w.daily_available_minutes or 480 for w in writers)
        print(f"Total Team Daily Capacity: {total_daily_capacity} mins")

        # 1. Total Workload Calculation
        deliverables = MonthlyDeliverable.query.filter_by(month=target_month, year=target_year).all()
        total_work_minutes = 0
        all_activities = []

        for d in deliverables:
            at = ActivityType.query.get(d.activity_type_id)
            if not at: continue
            
            qty = d.monthly_target
            total_work_minutes += at.activity_time * qty
            for _ in range(qty):
                all_activities.append({'client_id': d.client_id, 'at': at})

        print(f"Total Monthly Workload: {total_work_minutes} minutes")
        total_acts = len(all_activities)
        print(f"Total Tasks to assign: {total_acts}")
        
        # 2. Assignment Duration Calculation (estimate)
        estimate_days = -(-total_work_minutes // total_daily_capacity)
        print(f"Estimated Assignment Duration: {estimate_days} Working Days")

        # 3. Task Distribution Logic (Exhaustive)
        start_date = date(target_year, target_month, 1)
        
        # CLEAR EXISTING WITH CASCADE WORKAROUND
        task_ids = db.session.query(AutomationTask.id).filter_by(month=target_month, year=target_year, source='monthly').all()
        if task_ids:
            tid_list = [t[0] for t in task_ids]
            db.session.execute(task_activities.delete().where(task_activities.c.task_id.in_(tid_list)))
            AutomationTask.query.filter_by(month=target_month, year=target_year, source='monthly').delete()
            db.session.commit()
            print(f"Cleared {len(tid_list)} existing tasks.")

        act_idx = 0
        day_off = 0
        
        while act_idx < total_acts and day_off < 31:
            current_date = start_date + timedelta(days=day_off)
            print(f"Assigning for {current_date} (Day {day_off + 1})...")

            # Reset day's writer stats
            day_writer_stats = []
            for w in writers:
                rec = EmployeeDailyMinutes.query.filter_by(employee_id=w.id, date=current_date).first()
                if not rec:
                    rec = EmployeeDailyMinutes(
                        employee_id=w.id,
                        date=current_date,
                        available_minutes=w.daily_available_minutes or 480,
                        used_minutes=0
                    )
                    db.session.add(rec)
                else:
                    rec.used_minutes = 0 # Fresh automation run
                
                db.session.flush()
                day_writer_stats.append({
                    'employee': w,
                    'rec': rec,
                    'remaining': rec.available_minutes
                })

            # Fill the day's capacity
            tasks_on_day = 0
            while act_idx < total_acts:
                act = all_activities[act_idx]
                at = act['at']
                assigned = False
                
                for stat in day_writer_stats:
                    if stat['remaining'] >= at.activity_time:
                        seq = AutomationTask.query.filter_by(
                            client_id=act['client_id'], 
                            activity_type_id=at.id,
                            month=target_month,
                            year=target_year
                        ).count() + 1
                        
                        code = f"{str(target_year)[-1]}{str(target_month).zfill(2)}{act['client_id'][1:]}{at.code_letter}{str(seq).zfill(2)}"
                        
                        task = AutomationTask(
                            activity_code=code, client_id=act['client_id'], activity_type_id=at.id,
                            assigned_employee_id=stat['employee'].id, assigned_date=current_date,
                            month=target_month, year=target_year, status='Assigned',
                            priority=3, source='monthly', minutes_at_creation=at.activity_time
                        )
                        task.activities.append(at)
                        db.session.add(task)
                        
                        stat['rec'].used_minutes += at.activity_time
                        stat['remaining'] -= at.activity_time
                        
                        act_idx += 1
                        tasks_on_day += 1
                        assigned = True
                        break
                
                if not assigned:
                    break
            
            day_off += 1

        db.session.commit()
        print(f"Successfully generated and assigned {act_idx}/{total_acts} tasks across {day_off} days.")

if __name__ == "__main__":
    generate_monthly_tasks()
