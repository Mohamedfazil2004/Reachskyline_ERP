import os
from app import create_app, db
from app.models.automation import AutomationTask
from app.models.user import User
from datetime import date, datetime
import json

app = create_app()
with app.app_context():
    # Find user 'rajaguru'
    editor = User.query.filter(User.name.ilike('%rajaguru%')).first()
    if not editor:
        print("Rajaguru not found")
        exit()
    
    user_id = editor.id
    target_date = date(2026, 3, 5)
    daily_capacity = editor.daily_available_minutes or 480

    writer_done_statuses = ['Assigned to Editor', 'Video Submitted', 'Completed', 'Done']
    editor_done_statuses = ['Completed', 'Done']

    def is_employee_done_sim(task):
        is_writer = (task.assigned_employee_id == user_id)
        is_editor = (task.video_editor_id == user_id)
        writer_done = is_writer and task.status in writer_done_statuses
        editor_done = is_editor and task.status in editor_done_statuses
        if is_writer and is_editor:
            return writer_done and editor_done
        return writer_done or editor_done

    all_tasks = AutomationTask.query.filter(
        db.or_(
            AutomationTask.assigned_employee_id == user_id,
            AutomationTask.video_editor_id == user_id
        )
    ).all()

    urgent_tasks = []
    job_work_tasks = []
    past_tasks_by_day = {}
    today_tasks = []

    for t in all_tasks:
        is_today = (t.assigned_date == target_date)
        is_past = (t.assigned_date is not None and t.assigned_date < target_date)

        if is_past and is_employee_done_sim(t):
            continue

        if t.priority == 0:
            urgent_tasks.append(t)
            continue
        if t.priority == 1 or t.source == 'job_work':
            job_work_tasks.append(t)
            continue
        if is_today:
            today_tasks.append(t)
        elif is_past:
            d = t.assigned_date
            if d not in past_tasks_by_day:
                past_tasks_by_day[d] = []
            past_tasks_by_day[d].append(t)

    class TaskDisplay:
        def __init__(self):
            self.acc_mins = 0
            self.final_tasks = []

        def try_add(self, t_obj, label, show_free=True):
            done = is_employee_done_sim(t_obj)
            tm = t_obj.calculate_total_time
            
            if done:
                if show_free:
                    self.final_tasks.append({'code': t_obj.activity_code, 'status': t_obj.status, 'lbl': label})
                    return True
                else:
                    return True
            elif self.acc_mins + tm <= daily_capacity:
                self.final_tasks.append({'code': t_obj.activity_code, 'status': t_obj.status, 'lbl': label})
                self.acc_mins += tm
                return True
            else:
                return False

    display = TaskDisplay()

    # 1. Urgent
    for t in sorted(urgent_tasks, key=lambda x: x.id):
        display.try_add(t, 'URGENT', show_free=(t.assigned_date == target_date))

    # 2. Job Work
    for t in sorted(job_work_tasks, key=lambda x: (str(x.assigned_date or ''), x.id)):
        display.try_add(t, 'Job Work', show_free=(t.assigned_date == target_date))

    # 3. Pending
    cap_full = False
    for d in sorted(past_tasks_by_day.keys()):
        if cap_full: break
        for t in sorted(past_tasks_by_day[d], key=lambda x: x.id):
            if not display.try_add(t, 'Pending', show_free=False):
                cap_full = True
                break

    # 4. Today
    if not cap_full:
        for t in sorted(today_tasks, key=lambda x: x.id):
            if not display.try_add(t, 'Daily', show_free=True):
                break

    print(f"Rajaguru's Task Board (Simulation):")
    print(f"Capacity: {daily_capacity}")
    print(f"Tasks Visibility Count: {len(display.final_tasks)}")
    for t in display.final_tasks:
        print(f"- [{t['code']}] Status: {t['status']} Label: {t['lbl']}")
    print(f"Used Minutes: {display.acc_mins}")
