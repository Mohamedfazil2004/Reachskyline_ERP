import os
from app import create_app, db
from app.models.automation import AutomationTask
from app.models.user import User
from datetime import date, datetime

app = create_app()
with app.app_context():
    user = User.query.filter(User.name.ilike('%rajaguru%')).first()
    if not user:
        print("Rajaguru not found")
        exit()
    
    print(f"Checking for user: {user.name} (ID: {user.id})")
    
    target_date = date(2026, 3, 5)
    user_id = user.id
    
    all_tasks = AutomationTask.query.filter(
        db.or_(
            AutomationTask.assigned_employee_id == user_id,
            AutomationTask.video_editor_id == user_id
        ),
        db.or_(AutomationTask.assignment_time == None,
               AutomationTask.assignment_time <= datetime.utcnow())
    ).all()
    
    print(f"Total tasks associated with user: {len(all_tasks)}")
    
    writer_done_statuses = ['Assigned to Editor', 'Video Submitted', 'Completed', 'Done']
    editor_done_statuses = ['Completed', 'Done']

    def is_employee_done(task):
        is_writer = task.assigned_employee_id == user_id
        is_editor = task.video_editor_id == user_id
        writer_done = is_writer and task.status in writer_done_statuses
        editor_done = is_editor and task.status in editor_done_statuses
        if is_writer and is_editor:
            return writer_done and editor_done
        return writer_done or editor_done

    past_tasks_by_day = {}
    today_tasks = []
    urgent_tasks = []
    job_work_tasks = []

    for t in all_tasks:
        is_today = (t.assigned_date == target_date)
        is_past = (t.assigned_date is not None and t.assigned_date < target_date)
        
        # Check if done
        done = is_employee_done(t)
        
        print(f"Task {t.id} ({t.activity_code}): Date={t.assigned_date}, Status={t.status}, Writer={t.assigned_employee_id}, Editor={t.video_editor_id}, Done={done}")

        if is_past and done:
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

    print(f"\nUrgent tasks: {len(urgent_tasks)}")
    print(f"Job work tasks: {len(job_work_tasks)}")
    print(f"Past tasks by day keys: {list(past_tasks_by_day.keys())}")
    for d, tasks in past_tasks_by_day.items():
        print(f"  {d}: {len(tasks)} tasks")
    print(f"Today tasks: {len(today_tasks)}")

    # Blocking day
    sorted_past_days = sorted(past_tasks_by_day.keys())
    first_blocking_day = None
    for d in sorted_past_days:
        if past_tasks_by_day[d]:
            first_blocking_day = d
            break
    print(f"\nFirst blocking day: {first_blocking_day}")
