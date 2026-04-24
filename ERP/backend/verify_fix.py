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

    writer_done_statuses = ['Assigned to Editor', 'Video Submitted', 'Completed', 'Done']
    editor_done_statuses = ['Completed', 'Done']

    def is_employee_done(task):
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

        if is_past and is_employee_done(t): continue

        if t.priority == 0: urgent_tasks.append(t); continue
        if t.priority == 1 or t.source == 'job_work': job_work_tasks.append(t); continue
        
        if is_today: today_tasks.append(t)
        elif is_past:
            d = t.assigned_date
            if d not in past_tasks_by_day: past_tasks_by_day[d] = []
            past_tasks_by_day[d].append(t)

    final_tasks = []
    accumulated_mins = 0
    daily_capacity = editor.daily_available_minutes or 480

    print(f"Daily Capacity: {daily_capacity}")

    acc = 0
    tasks_to_show = []

    for t in sorted(urgent_tasks, key=lambda x: x.id):
        done = is_employee_done(t)
        today = (t.assigned_date == target_date)
        if done:
            if today: tasks_to_show.append(t.id)
        else:
            tasks_to_show.append(t.id)
            acc += t.calculate_total_time

    for t in sorted(job_work_tasks, key=lambda x: (str(x.assigned_date or ''), x.id)):
        done = is_employee_done(t)
        today = (t.assigned_date == target_date)
        if done:
            if today: tasks_to_show.append(t.id)
        else:
            tasks_to_show.append(t.id)
            acc += t.calculate_total_time

    cap_full = False
    for d in sorted(past_tasks_by_day.keys()):
        if cap_full: break
        for t in sorted(past_tasks_by_day[d], key=lambda x: x.id):
            done = is_employee_done(t)
            if done: continue # already skipped in bucketization but anyway
            tm = t.calculate_total_time
            if acc + tm <= daily_capacity:
                tasks_to_show.append(t.id)
                acc += tm
            else:
                cap_full = True; break

    if not cap_full:
        for t in sorted(today_tasks, key=lambda x: x.id):
            done = is_employee_done(t)
            tm = t.calculate_total_time
            if done:
                tasks_to_show.append(t.id)
            elif acc + tm <= daily_capacity:
                tasks_to_show.append(t.id)
                acc += tm
            else:
                break

    print(f"Final tasks to show: {len(tasks_to_show)}")
    print(f"Task IDs: {tasks_to_show}")
    print(f"Total Accumulated Mins: {acc}")
