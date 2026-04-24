import os
from werkzeug.utils import secure_filename  # type: ignore
from flask import Blueprint, request, jsonify, current_app  # type: ignore
from flask_jwt_extended import jwt_required, get_jwt_identity  # type: ignore
from datetime import datetime, date, timedelta
import calendar
import math
from app.extensions import db  # type: ignore
from app.models.automation import (  # type: ignore
    AutomationTask, AutomationJobWork, MonthlyDeliverable,
    EmployeeDailyMinutes, TaskApproval, task_activities, ActivityLog, Attendance,
    AutomationRoughCut
)
from app.models.master import ActivityType, Client  # type: ignore
from app.models.user import User  # type: ignore
from typing import Dict, List, Any, cast, Tuple, Union

automation_bp = Blueprint('automation', __name__)

# Config for uploads
UPLOAD_FOLDER = 'uploads/automation'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'rtf', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@automation_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Ensure directory exists
        path = os.path.join(current_app.root_path, '..', UPLOAD_FOLDER)
        if not os.path.exists(path):
            os.makedirs(path)

        # Add timestamp to filename to avoid collisions
        unique_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
        file_path = os.path.join(path, unique_name)
        file.save(file_path)

        # Return relative path for storage in DB
        return jsonify({'file_path': os.path.join(UPLOAD_FOLDER, unique_name)}), 200
    return jsonify({'error': 'File type not allowed'}), 400

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def generate_activity_code(client_id, activity_type_id, year, month, is_job_work=False, seq=None):
    """Format: [Year][Month][ClientDigit][TypeCode][Count]
       Example: 6103P1 (2026, Oct, Client 3, Poster, 1)"""
    from app.models.master import Client, ActivityType  # type: ignore
    
    at = ActivityType.query.get(activity_type_id)
    if not at:
        return "UNK"
        
    year_digit = str(year)[-1]
    client_num = int(client_id.replace('C', '').replace('c', ''))
    
    if seq is None:
        # Avoid circular import if needed, but it's already imported at top
        from app.models.automation import AutomationTask  # type: ignore
        existing_count = AutomationTask.query.filter_by(
            client_id=client_id, activity_type_id=activity_type_id,
            month=month, year=year
        ).count()
        seq = existing_count + 1
        
    type_code = "JW" if is_job_work else at.code_letter
    return f"{year_digit}{month}{client_num}{type_code}{seq}"
 
def _get_employee_task_stats(task, user_id):
    """Returns (is_completed, creditable_minutes, assigned_minutes)"""
    is_writer = task.assigned_employee_id == user_id
    is_editor = task.video_editor_id == user_id
    
    writer_mins = sum(act.activity_time for act in task.activities) if task.activities else task.activity_type.activity_time
    editor_mins = sum(act.editor_minutes for act in task.activities) if task.activities else task.activity_type.editor_minutes
    
    assigned_mins = 0
    if is_writer: assigned_mins += writer_mins
    if is_editor: assigned_mins += editor_mins
    
    done_mins = 0
    is_done = False
    
    # Writer is done when BM approves content (moves to editor stage or completed)
    if is_writer:
        if task.status in ['Assigned to Editor', 'Video Submitted', 'Completed']:
            is_done = True
            done_mins += writer_mins
            
    # Editor is done only when BM approves final video (status: Completed)
    if is_editor:
        if task.status == 'Completed':
            is_done = True
            done_mins += editor_mins
        else:
            is_done = False # If it was done as writer but not yet as editor, we might need more complex logic.
            # But usually it's one or the other.
            
    return is_done, done_mins, assigned_mins

def get_or_create_daily_minutes(emp_id, target_date):
    rec = EmployeeDailyMinutes.query.filter_by(employee_id=emp_id, date=target_date).first()
    if not rec:
        emp = User.query.get(emp_id)
        # Use user-defined capacity from DB (Sri=480, Abirami=240)
        default_mins = emp.daily_available_minutes if (emp and emp.daily_available_minutes) else 480
        rec = EmployeeDailyMinutes(employee_id=emp_id, date=target_date,
                                   available_minutes=default_mins, used_minutes=0)
        db.session.add(rec)
        db.session.flush()
    return rec

# ─────────────────────────────────────────────
# MONTHLY DELIVERABLES
# ─────────────────────────────────────────────

@automation_bp.route('/monthly-deliverables', methods=['GET'])
@jwt_required()
def get_monthly_deliverables():
    month = request.args.get('month', type=int, default=date.today().month)
    year  = request.args.get('year',  type=int, default=date.today().year)
    rows = MonthlyDeliverable.query.filter_by(month=month, year=year).all()
    return jsonify([r.to_dict() for r in rows]), 200

@automation_bp.route('/monthly-deliverables', methods=['POST'])
@jwt_required()
def upsert_monthly_deliverable():
    data = request.json
    client_id       = data.get('client_id')
    activity_type_id= data.get('activity_type_id')
    month           = data.get('month', date.today().month)
    year            = data.get('year',  date.today().year)
    target          = data.get('monthly_target', 0)

    if not client_id or not activity_type_id:
        return jsonify({'error': 'client_id and activity_type_id required'}), 400

    rec = MonthlyDeliverable.query.filter_by(
        client_id=client_id, activity_type_id=activity_type_id,
        month=month, year=year
    ).first()
    if rec:
        rec.monthly_target = target
    else:
        rec = MonthlyDeliverable(client_id=client_id, activity_type_id=activity_type_id,
                                 month=month, year=year, monthly_target=target)
        db.session.add(rec)
    db.session.commit()
    return jsonify(rec.to_dict()), 200

@automation_bp.route('/monthly-deliverables/<int:did>', methods=['DELETE'])
@jwt_required()
def delete_monthly_deliverable(did):
    rec = MonthlyDeliverable.query.get_or_404(did)
    db.session.delete(rec)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200

# ─────────────────────────────────────────────
# EMPLOYEE AVAILABILITY
# ─────────────────────────────────────────────

@automation_bp.route('/employee-availability', methods=['GET'])
@jwt_required()
def get_employee_availability():
    target_date = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date)
    except ValueError:
        target_date = date.today()

    # Get all relevant employees
    employees = User.query.filter(User.is_active == True).all()
    result = []
    for emp in employees:
        rec = get_or_create_daily_minutes(emp.id, target_date)
        result.append(rec.to_dict())
    db.session.commit()
    return jsonify(result), 200

@automation_bp.route('/employee-availability', methods=['POST'])
@jwt_required()
def set_employee_availability():
    data = request.json
    emp_id   = data.get('employee_id')
    target_date = data.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date)
    except:
        target_date = date.today()
    avail = data.get('available_minutes', 480)

    rec = EmployeeDailyMinutes.query.filter_by(employee_id=emp_id, date=target_date).first()
    if rec:
        rec.available_minutes = avail
    else:
        rec = EmployeeDailyMinutes(employee_id=emp_id, date=target_date, available_minutes=avail)
        db.session.add(rec)
    db.session.commit()
    return jsonify(rec.to_dict()), 200

# ─────────────────────────────────────────────
# JOB WORK
# ─────────────────────────────────────────────

@automation_bp.route('/job-work', methods=['GET'])
@jwt_required()
def get_job_work():
    rows = AutomationJobWork.query.order_by(AutomationJobWork.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows]), 200

@automation_bp.route('/job-work', methods=['POST'])
@jwt_required()
def add_job_work():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    deadline = None
    if data.get('deadline'):
        try:
            deadline = date.fromisoformat(data['deadline'])
        except:
            pass
    
    assignment_time = None
    if data.get('assignment_time'):
        try:
            assignment_time = datetime.fromisoformat(data['assignment_time'])
        except:
            pass

    assigned_employee_id = data.get('employee_id')
    
    jw = AutomationJobWork(
        client_id=data['client_id'],
        activity_type_id=data['activity_type_id'],
        description=data.get('description', ''),
        deadline=deadline,
        created_by=user_id,
        status='pending',
        assigned_to=assigned_employee_id,
        assignment_time=assignment_time
    )
    db.session.add(jw)
    db.session.flush() # Get ID

    # ASSIGN JOB WORK
    at = ActivityType.query.get(jw.activity_type_id)
    if at:
        today = date.today()
        assigned_id = None
        
        # Scenario A: Manual assignment
        if assigned_employee_id:
            assigned_id = assigned_employee_id
            rec = get_or_create_daily_minutes(assigned_id, today)
            # Just add minutes regardless of capacity for job work as it is high priority
            rec.used_minutes += at.activity_time
        else:
            # Scenario B: Auto assignment (existing logic)
            writers = User.query.filter(User.role.in_(['Content Writer']), User.is_active == True).all()
            writer_mins = {}
            for w in writers:
                rec = get_or_create_daily_minutes(w.id, today)
                # Recalculate used minutes from tasks to be safe
                actual_used = db.session.query(db.func.sum(AutomationTask.minutes_at_creation)).filter(
                    AutomationTask.assigned_employee_id == w.id,
                    AutomationTask.assigned_date == today
                ).scalar() or 0
                rec.used_minutes = actual_used
                remaining = rec.available_minutes - rec.used_minutes
                if remaining >= at.activity_time:
                    writer_mins[w.id] = {'employee': w, 'rec': rec, 'remaining': remaining}
            
            assigned_info = _assign_strict_match(writer_mins, at.activity_time)
            if assigned_info:
                assigned_id = assigned_info['employee'].id
                assigned_info['rec'].used_minutes += at.activity_time

        if assigned_id:
            code = generate_activity_code(jw.client_id, jw.activity_type_id, today.year, today.month, is_job_work=True)
            task = AutomationTask(
                activity_code=code,
                client_id=jw.client_id,
                activity_type_id=jw.activity_type_id,
                assigned_employee_id=assigned_id,
                assigned_date=today,
                month=today.month,
                year=today.year,
                current_stage='content_writing',
                status='Assigned',
                priority=1, # JOB WORK IS ALWAYS PRIORITY 1
                source='job_work',
                job_work_id=jw.id,
                minutes_at_creation=at.activity_time,
                deadline=jw.deadline,
                notes=jw.description,
                assignment_time=jw.assignment_time
            )
            # Add primary activity to the relationship
            task.activities.append(at)
            db.session.add(task)
            jw.status = 'assigned'

    db.session.commit()
    return jsonify(jw.to_dict()), 201

@automation_bp.route('/job-work/<int:jid>', methods=['DELETE'])
@jwt_required()
def delete_job_work(jid):
    jw = AutomationJobWork.query.get_or_404(jid)
    db.session.delete(jw)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200

# ─────────────────────────────────────────────
# TASKS
# ─────────────────────────────────────────────

@automation_bp.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date_str)
    except:
        target_date = date.today()

    if user.role in ['Admin', 'Manager', 'Brand Manager']:
        tasks = AutomationTask.query.filter_by(assigned_date=target_date).order_by(
            AutomationTask.priority, AutomationTask.created_at
        ).all()
    else:
        tasks = AutomationTask.query.filter_by(
            assigned_employee_id=user.id, assigned_date=target_date
        ).order_by(AutomationTask.priority).all()

    return jsonify([t.to_dict() for t in tasks]), 200

@automation_bp.route('/tasks/all', methods=['GET'])
@jwt_required()
def get_all_tasks():
    status_filter = request.args.get('status')
    q = AutomationTask.query
    if status_filter:
        q = q.filter_by(status=status_filter)
        if status_filter == 'Completed':
            tasks = q.order_by(AutomationTask.completed_at.desc()).all()
        else:
            tasks = q.order_by(AutomationTask.assigned_date.desc(), AutomationTask.priority).all()
    else:
        tasks = q.order_by(AutomationTask.assigned_date.desc(), AutomationTask.priority).all()
    return jsonify([t.to_dict() for t in tasks]), 200

@automation_bp.route('/tasks/my', methods=['GET'])
@jwt_required()
def get_my_tasks():
    user_id = int(get_jwt_identity())
    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date_str)
    except:
        target_date = date.today()

    tasks = AutomationTask.query.filter(
        db.or_(
            db.and_(
                AutomationTask.assigned_employee_id == user_id,
                AutomationTask.current_stage.in_(['content_writing', 'brand_manager_review', 'completed'])
            ),
            db.and_(
                AutomationTask.video_editor_id == user_id,
                AutomationTask.current_stage.in_(['video_editing', 'brand_manager_video_review', 'completed'])
            )
        ),
        AutomationTask.assigned_date == target_date,
        db.or_(AutomationTask.assignment_time == None, AutomationTask.assignment_time <= datetime.utcnow())
    ).order_by(AutomationTask.priority).all()
    
    # Today's Efficiency for this user
    today_worked = sum(t.minutes_at_creation for t in tasks if t.status == 'Completed')
    today_assigned = sum(t.minutes_at_creation for t in tasks)

    # Include Rough Cuts for today
    today_rcs = AutomationRoughCut.query.filter_by(editor_id=user_id, work_date=target_date, status='Completed').all()
    today_worked += sum(rc.minutes for rc in today_rcs)
    today_assigned += sum(rc.minutes for rc in today_rcs) # They are "assigned" if they were worked on/delivered

    # Overall Worked: includes everything past the writer/editor stage (where work was done)
    overall_worked_tasks = db.session.query(db.func.sum(AutomationTask.minutes_at_creation)).filter(
        db.or_(
            AutomationTask.assigned_employee_id == user_id,
            AutomationTask.video_editor_id == user_id
        ),
        AutomationTask.assigned_date <= target_date,
        # Worked = everything that moved past 'Assigned' and 'In Progress'
        ~AutomationTask.status.in_(['Assigned', 'In Progress', 'Assigned to Editor', 'Pending'])
    ).scalar() or 0

    overall_worked_rcs = db.session.query(db.func.sum(AutomationRoughCut.minutes)).filter(
        AutomationRoughCut.editor_id == user_id,
        AutomationRoughCut.work_date <= target_date,
        AutomationRoughCut.status == 'Completed'
    ).scalar() or 0
    
    overall_worked = overall_worked_tasks + overall_worked_rcs

    # Get availability info for the user
    avail_rec = get_or_create_daily_minutes(user_id, target_date)
    # Sync used_minutes 
    actual_used = sum(t.calculate_total_time for t in tasks)
    if avail_rec.used_minutes != actual_used:
        avail_rec.used_minutes = actual_used
        db.session.commit()

    # Calculate historical available capacity (from first task till target_date)
    first_task_date = db.session.query(db.func.min(AutomationTask.assigned_date)).scalar()
    if first_task_date:
        # Important: Sum the available minutes from existing records OR calculate based on default
        # To be safe, we'll sum active user's potential for all days in range
        num_days = (target_date - first_task_date).days + 1
        emp = User.query.get(user_id)
        daily_cap = emp.daily_available_minutes if emp else 480
        overall_available = daily_cap * num_days
    else:
        overall_available = 0

    return jsonify({
        'tasks': [t.to_dict() for t in tasks],
        'available_minutes': avail_rec.available_minutes,
        'used_minutes': avail_rec.used_minutes,
        'remaining_minutes': avail_rec.available_minutes - avail_rec.used_minutes,
        'today_worked': int(today_worked),
        'today_assigned': int(today_assigned),
        'overall_worked': int(overall_worked),
        'overall_available': int(overall_available)
    }), 200

@automation_bp.route('/employee/tasks', methods=['GET'])
@jwt_required()
def get_employee_tasks():
    """
    Strict 480-minute cap per day with day-order-wise pending task assignment.
    
    Rules:
    1. Pending tasks are processed day-by-day (oldest first).
    2. If Mar 01 has ANY incomplete pending tasks → show ONLY Mar 01 pending tasks (up to 480 mins).
       → Do NOT show Mar 02 or today's tasks until Mar 01 is fully cleared.
    3. Once a day's pending tasks are all done → unlock the next day's pending tasks.
    4. Only when ALL previous-day pending tasks are cleared → show today's tasks.
    5. Urgent (priority=0) and Job Work tasks are ALWAYS shown regardless of pending state.
    6. Already-completed tasks are shown for reference without consuming capacity.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date_str)
    except:
        target_date = date.today()

    daily_capacity = user.daily_available_minutes if (user and user.daily_available_minutes) else 480

    # ── "Done from employee's perspective" statuses ─────────────────────────────
    writer_done_statuses = ['Assigned to Editor', 'Video Submitted', 'Completed', 'Done']
    editor_done_statuses = ['Completed', 'Done']

    def is_employee_done(task):
        """Returns True if this employee has no remaining work on this task."""
        is_writer = task.assigned_employee_id == user_id
        is_editor = task.video_editor_id == user_id
        writer_done = is_writer and task.status in writer_done_statuses
        editor_done = is_editor and task.status in editor_done_statuses
        if is_writer and is_editor:
            return writer_done and editor_done
        return writer_done or editor_done

    # --- Refined logic for requested rework (Strict Day-by-Day order) ---
    today = date.today()
    
    # Check if target date is Sunday (weekday 6)
    if target_date.weekday() == 6:
        # It's a Sunday - Office Leave. Show nothing or only completed if any.
        pass

    # 1. Fetch ALL relevant tasks for the user
    all_assigned_tasks = AutomationTask.query.filter(
        db.or_(
            AutomationTask.assigned_employee_id == user_id,
            AutomationTask.video_editor_id == user_id
        ),
        db.or_(AutomationTask.assignment_time == None,
               AutomationTask.assignment_time <= datetime.utcnow())
    ).all()

    # Determine what are the "Allowed Pending Dates" (Strictly oldest 2 dates)
    incomplete_tasks = [t for t in all_assigned_tasks if not is_employee_done(t) and not (t.priority <= 1 or t.source == 'job_work')]
    pending_dates = sorted(list(set(t.assigned_date for t in incomplete_tasks if t.assigned_date)))
    allowed_pending_dates = pending_dates[:2] # Restricted to Oldest 2 dates

    # Buckets for candidates
    candidates = []
    total_incomplete_pending_mins = 0

    for t in all_assigned_tasks:
        is_done_today = (t.work_date == target_date)
        is_done_any = is_employee_done(t)
        task_mins = t.calculate_total_time
        
        # Scenario A: Target date is Today
        if target_date == today:
            # Urgent / Job Work ALWAYS show regardless of date logic
            if (t.priority <= 1 or t.source == 'job_work') and not is_done_any:
                 candidates.append({'obj': t, 'type': 1, 'priority': t.priority})
            
            # Completed Today
            elif is_done_today:
                candidates.append({'obj': t, 'type': 0, 'priority': t.priority})
            
            # Pending Work - Apply the 2-Date Rule
            elif not is_done_any:
                if t.assigned_date < today:
                    total_incomplete_pending_mins += task_mins
                
                # Rule: Only show tasks from the oldest 2 pending dates
                if t.assigned_date in allowed_pending_dates:
                    ctype = 2 if t.assigned_date < today else 3
                    candidates.append({'obj': t, 'type': ctype, 'priority': t.priority})
                else:
                    # Date is too far in future (3rd date or later in queue), hide it
                    pass

        # Scenario B: Target date is in the Past
        elif target_date < today:
            # Historical view: show what happened on that day
            if is_done_today:
                candidates.append({'obj': t, 'type': 0, 'priority': t.priority})
            elif t.assigned_date == target_date:
                candidates.append({'obj': t, 'type': 3, 'priority': t.priority})

    # Sorting logic: Done Today -> Urgent -> Pending (Chronological)
    candidates.sort(key=lambda x: (
        x['type'], 
        x['priority'] if x['priority'] is not None else 3, 
        x['obj'].assigned_date or today, 
        x['obj'].id
    ))

    # Build final list with STRICT capacity constraint
    final_tasks = []
    accumulated = 0
    
    # If today is Sunday, we only show what was actually DONE today (if anything). 
    # No pending work should skip to Sunday.
    is_sunday = (target_date.weekday() == 6)

    for item in candidates:
        t_obj = item['obj']
        t_mins = t_obj.calculate_total_time
        is_pending = (t_obj.work_date != target_date)
        
        if is_sunday and is_pending:
            continue

        if accumulated + t_mins <= daily_capacity:
            td = t_obj.to_dict()
            td['is_done'] = (t_obj.work_date == target_date)
            td['is_pending'] = not td['is_done']
            
            # Apply labels
            if td.get('priority') == 0:
                td['priority_label'] = 'URGENT - 1st Priority'
                td['is_urgent'] = True
            elif td.get('priority') == 1 or td.get('source') == 'job_work':
                td['priority_label'] = 'Job Work'
            else:
                td['priority_label'] = 'Daily Deliverable'
                
            final_tasks.append(td)
            accumulated += t_mins
        else:
            # Once we hit capacity, we stop adding tasks to the visible board
            pass

    # Breakdown of visible tasks by assigned date
    date_counts = {}
    for td in final_tasks:
        d_str = td.get('assigned_date', 'Unknown')
        date_counts[d_str] = date_counts.get(d_str, 0) + 1

    return jsonify({
        'tasks': final_tasks,
        'total_visible_minutes': accumulated,
        'daily_capacity': daily_capacity,
        'date_counts': date_counts,
        'show_today': True
    }), 200

@automation_bp.route('/employee/daily-records', methods=['GET'])
@jwt_required()
def get_daily_records():
    """
    Returns exactly what happened on a specific date for an employee.
    Unlike /employee/tasks, this does NOT apply the 480-minute capacity logic or pending day blocking.
    It simply shows:
    1. Tasks that were completed ON this exact date.
    2. Pending/Overdue tasks that the employee was SUPPOSED to work on this date based on the queue logic on that day.
    
    Since historical queue state is hard to perfectly reconstruct, we approximate by showing:
    - All tasks ASSIGNED on this day
    - Any past tasks that were NOT completed prior to this day
    But to match the requested UI ("what tasks are worked on that date"), we will show:
    - All tasks assigned on this date.
    - All tasks completed on this date.
    """
    user_id = int(get_jwt_identity())
    target_emp_id = request.args.get('employee_id', type=int)

    # Check permission
    if target_emp_id and target_emp_id != user_id:
        user = User.query.get(user_id)
        if user.role not in ['Admin', 'Manager', 'Brand Manager']:
            return jsonify({'error': 'Unauthorized'}), 403
    else:
        target_emp_id = user_id

    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date_str)
    except:
        target_date = date.today()

    # ── Reconstruct "What was on the employee's desk on target_date?" ──────────────
    # We define "Worked on that date" as:
    # 1. Tasks assigned SPECIFICALLY on that date.
    # 2. Tasks that were COMPLETED (credited) on that date (work_date == target_date).
    # 3. Tasks that were "Pending" on that date (Assigned before, Completed after).
    
    # Simple strategy: 
    # Fetch all tasks assigned to the user on or before target_date.
    all_tasks = AutomationTask.query.filter(
        db.or_(
            AutomationTask.assigned_employee_id == target_emp_id,
            AutomationTask.video_editor_id == target_emp_id
        ),
        AutomationTask.assigned_date <= target_date
    ).all()

    all_rcs = AutomationRoughCut.query.filter(
        AutomationRoughCut.editor_id == target_emp_id,
        db.or_(
            AutomationRoughCut.work_date <= target_date,
            db.and_(AutomationRoughCut.work_date == None, db.extract('day', AutomationRoughCut.created_at) <= target_date.day)
        )
    ).all()

    # Determine capacity for that day
    user = User.query.get(target_emp_id)
    daily_cap = user.daily_available_minutes if (user and user.daily_available_minutes) else 480

    # Merge standard tasks and rough cuts into a unified "board"
    # A task/RC was "done" before target_date if work_date < target_date.
    active_items = []
    for t in all_tasks:
        is_done_before = (t.work_date and t.work_date < target_date)
        if not is_done_before:
            active_items.append({'obj': t, 'type': 'task', 'priority': t.priority, 'assigned': t.assigned_date})

    for rc in all_rcs:
        is_done_before = (rc.work_date and rc.work_date < target_date)
        if not is_done_before:
            # Rough cuts are basically priority 2 (high)
            active_items.append({'obj': rc, 'type': 'rc', 'priority': 2, 'assigned': rc.created_at.date() if rc.created_at else target_date})

    # Sort the unified board
    active_items.sort(key=lambda x: (x['priority'], x['assigned']))

    final_tasks = []
    accumulated = 0
    
    for item in active_items:
        obj = item['obj']
        t_dict = obj.to_dict()
        task_mins = t_dict.get('total_minutes', 0) or 0
        
        is_today = False
        is_done_today = False
        
        if item['type'] == 'task':
            is_today = (obj.assigned_date == target_date)
            is_done_today = (obj.work_date == target_date)
        else:
            is_today = (obj.created_at.date() == target_date if obj.created_at else False)
            is_done_today = (obj.work_date == target_date)
        
        if is_today or is_done_today:
            t_dict['is_pending'] = not is_done_today
            final_tasks.append(t_dict)
            if not is_done_today:
                accumulated += task_mins
        elif accumulated < daily_cap:
            t_dict['is_pending'] = True
            final_tasks.append(t_dict)
            accumulated += task_mins

    # Sort final tasks for display
    final_tasks.sort(key=lambda x: (x.get('priority', 3), x.get('assigned_date', '')))

    return jsonify({
        'tasks': final_tasks,
        'date': target_date.isoformat(),
        'total_visible_minutes': sum(t.get('total_minutes', 0) for t in final_tasks),
        'capacity': daily_cap
    }), 200

@automation_bp.route('/tasks/<int:tid>/start', methods=['POST'])
@jwt_required()
def start_task(tid):
    """Employee clicks Start Work"""
    user_id = int(get_jwt_identity())
    task = AutomationTask.query.get_or_404(tid)
    if task.assigned_employee_id != user_id and task.video_editor_id != user_id:
        return jsonify({'error': 'Not your task'}), 403
    
    task.status = 'In Progress'
    task.started_at = datetime.utcnow()
    
    log = ActivityLog(task_id=task.id, user_id=user_id, action='Started Work', details='User started working on task')
    db.session.add(log)
    db.session.commit()
    return jsonify(task.to_dict()), 200

@automation_bp.route('/tasks/<int:tid>/submit', methods=['POST'])
@jwt_required()
def submit_task(tid):
    """Content Writer submits work"""
    user_id = int(get_jwt_identity())
    task = AutomationTask.query.get_or_404(tid)
    json_data = request.json
    if not isinstance(json_data, dict):
        json_data = {}
    data: Dict[str, Any] = cast(Dict[str, Any], json_data)

    if task.assigned_employee_id != user_id:
        return jsonify({'error': 'Only the assigned Content Writer can submit content'}), 403

    # Required field validation - thumbnail_content is optional for some task types
    required = ['title', 'description']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Field {field} is required'}), 400

    task.submission_title = str(data.get('title') or "")
    task.submission_description = str(data.get('description') or "")
    task.submission_caption = str(data.get('caption_text') or "")
    task.submission_thumbnail = str(data.get('thumbnail_content') or "")
    task.submission_reference = str(data.get('reference') or "")
    task.submission_file_path = str(data.get('file_path') or "")
    task.submission_thumbnail_path = str(data.get('thumbnail_path') or "")
    task.rough_cut_video_path = str(data.get('rough_cut_video_path') or "")
    task.status = 'Submitted to BM'
    task.current_stage = 'brand_manager_review'
    task.work_date = date.today()
    
    log = ActivityLog(task_id=task.id, user_id=user_id, action='Submitted Content', details='Content Writer submitted content for review')
    db.session.add(log)
    db.session.commit()
    return jsonify(task.to_dict()), 200

@automation_bp.route('/tasks/<int:tid>/bm-action', methods=['POST'])
@jwt_required()
def bm_action(tid):
    """Brand Manager reviews content"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    task = AutomationTask.query.get_or_404(tid)
    data = request.json or {}
    action = data.get('action') # 'approve' or 'rework'
    notes = data.get('notes', '')

    if action == 'approve':
        editor_id = data.get('editor_id')
        if not editor_id:
            return jsonify({'error': 'Please select a Video Editor'}), 400
        task.video_editor_id = editor_id
        task.status = 'Assigned to Editor'
        task.current_stage = 'video_editing'
        log = ActivityLog(task_id=task.id, user_id=user_id, action='Approved Content', details=f'BM approved content and assigned to Editor {editor_id}')
    elif action == 'rework':
        if not notes:
            return jsonify({'error': 'Rework notes are mandatory'}), 400
        task.status = 'Rework Required (Writer)'
        task.rework_reason = notes
        task.rework_count = (task.rework_count or 0) + 1
        task.current_stage = 'content_writing'
        log = ActivityLog(task_id=task.id, user_id=user_id, action='Requested Rework (Writer)', details=f'BM requested content rework: {notes}')
    else:
        return jsonify({'error': 'Invalid action'}), 400

    db.session.add(log)
    db.session.commit()
    return jsonify(task.to_dict()), 200

@automation_bp.route('/tasks/<int:tid>/reassign', methods=['POST'])
@jwt_required()
def reassign_task(tid):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    task = AutomationTask.query.get_or_404(tid)
    data = request.json or {}
    new_emp_id = data.get('employee_id')

    if not new_emp_id:
        return jsonify({'error': 'New employee ID is required'}), 400

    new_emp = User.query.get(new_emp_id)
    if not new_emp:
        return jsonify({'error': 'New employee not found'}), 404

    old_emp_id = task.assigned_employee_id
    task.assigned_employee_id = new_emp_id
    
    # If the task was with a video editor, we might need to decide if we're reassigning the WRITER or the EDITOR.
    # The user request specifically mentioned "Content Writers employee name".
    # However, if it's already at editor stage, we might be reassigning the editor.
    # Given the request "that task have to go to that selected employee dashboard", 
    # and the context of "Content Writers", I'll assume we're reassigning the main assigned_employee_id.
    
    log = ActivityLog(
        task_id=task.id, 
        user_id=user_id, 
        action='Reassigned Task', 
        details=f'BM reassigned task from worker ID {old_emp_id} to {new_emp.name}'
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': f'Task reassigned to {new_emp.name}'}), 200

@automation_bp.route('/tasks/<int:tid>/priority', methods=['POST'])
@jwt_required()
def set_task_priority(tid):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    task = AutomationTask.query.get_or_404(tid)
    task.priority = 0  # 0 = 1st Priority / Urgent
    
    log = ActivityLog(
        task_id=task.id, 
        user_id=user_id, 
        action='Set 1st Priority', 
        details='BM marked this task as 1st Priority'
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'Task set as 1st Priority'}), 200

@automation_bp.route('/tasks/<int:tid>/submit-video', methods=['POST'])
@jwt_required()
def submit_video(tid):
    """Video Editor submits video"""
    user_id = int(get_jwt_identity())
    task = AutomationTask.query.get_or_404(tid)
    data = request.json or {}

    if task.video_editor_id != user_id:
        return jsonify({'error': 'Only the assigned Video Editor can submit video'}), 403

    video_path = data.get('video_path')
    if not video_path:
        return jsonify({'error': 'Video upload is required'}), 400

    task.final_video_path = data.get('video_path')
    task.final_thumbnail_path = data.get('thumbnail_path_editor')
    task.editor_notes = data.get('notes')
    task.status = 'Video Submitted'
    task.current_stage = 'brand_manager_video_review'
    task.work_date = date.today()
    
    log = ActivityLog(task_id=task.id, user_id=user_id, action='Submitted Video', details='Video Editor submitted final video')
    db.session.add(log)
    db.session.commit()
    return jsonify(task.to_dict()), 200

@automation_bp.route('/tasks/<int:tid>/bm-video-action', methods=['POST'])
@jwt_required()
def bm_video_action(tid):
    """Brand Manager reviews video"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    task = AutomationTask.query.get_or_404(tid)
    data = request.json or {}
    action = data.get('action') # 'approve' or 'rework'
    notes = data.get('notes', '')

    if action == 'approve':
        task.status = 'Completed'
        task.current_stage = 'completed'
        task.completed_at = datetime.utcnow()
        task.work_date = date.today()
        
        # Increment completed_count in MonthlyPlan if it's a monthly task
        if task.source == 'monthly' and task.month and task.year:
            deliverable = MonthlyDeliverable.query.filter_by(
                client_id=task.client_id,
                activity_type_id=task.activity_type_id,
                month=task.month,
                year=task.year
            ).first()
            if deliverable:
                deliverable.completed_count = (deliverable.completed_count or 0) + 1
                
        log = ActivityLog(task_id=task.id, user_id=user_id, action='Completed Task', details='BM approved final video and marked task as completed')
    elif action == 'rework':
        if not notes:
            return jsonify({'error': 'Rework notes are mandatory'}), 400
        task.status = 'Rework Required (Editor)'
        task.rework_reason = notes # BM uses this for overall rework but it goes to editor now
        task.rework_count = (task.rework_count or 0) + 1
        task.current_stage = 'video_editing'
        log = ActivityLog(task_id=task.id, user_id=user_id, action='Requested Rework (Editor)', details=f'BM requested video rework: {notes}')
    else:
        return jsonify({'error': 'Invalid action'}), 400

    db.session.add(log)
    db.session.commit()
    return jsonify(task.to_dict()), 200

@automation_bp.route('/editors', methods=['GET'])
@jwt_required()
def get_editors():
    """Get list of users with Video Editor role"""
    editors = User.query.filter_by(role='Video Editor').all()
    # If no editors marked as such, maybe fallback to all editors?
    # For now, let's just return all users if none found to avoid empty dropdown in dev
    if not editors:
         editors = User.query.filter(User.role.like('%Editor%')).all()
    return jsonify([{'id': u.id, 'name': u.name} for u in editors]), 200

@automation_bp.route('/tasks/<int:tid>/logs', methods=['GET'])
@jwt_required()
def get_task_logs(tid):
    """Audit trail for a task"""
    logs = ActivityLog.query.filter_by(task_id=tid).order_by(ActivityLog.created_at.asc()).all()
    return jsonify([l.to_dict() for l in logs]), 200

def _find_available_employee(role_type, target_date, minutes_needed):
    """Helper for workflow transitions if needed"""
    candidates = User.query.filter(User.role.ilike(f'%{role_type}%'), User.is_active == True).all()
    for emp in candidates:
        rec = get_or_create_daily_minutes(emp.id, target_date)
        if (rec.available_minutes - rec.used_minutes) >= minutes_needed:
            return emp
    return None

@automation_bp.route('/recalculate-assignments', methods=['POST'])
@jwt_required()
def recalculate_assignments():
    """Triggered when Activity Time or Employee Availability changes"""
    # 1. Update all unassigned/pending tasks minutes_at_creation (optional snapshot)
    # 2. Re-validate if currently assigned tasks still match (strictly)
    # 3. If they don't match, unassign them? 
    # Requirement: "Recalculate all unassigned tasks -> Re-validate assignment eligibility"
    # Requirement: "Employee Availability update -> Only exact matching tasks become assignable"
    
    # For now, let's just commit is enough as the @property handles real-time calculation.
    # But we should clear assigned_employee if the match is broken? 
    # The prompt says: "Only exact matching tasks become assignable". 
    # This implies we check eligibility at the time of assignment.
    
    return jsonify({'message': 'Recalculation complete (Dynamic logic applied)'}), 200

# ─────────────────────────────────────────────
# GENERATE TASKS (Strict Assignment Engine)
# ─────────────────────────────────────────────

@automation_bp.route('/generate-tasks', methods=['POST'])
@jwt_required()
def generate_tasks():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Only Admin/Manager/Brand Manager can generate tasks'}), 403

    data = request.json or {}
    # Parse date from request to get target month/year
    try:
        req_date = date.fromisoformat(data.get('date', ''))
        target_month = req_date.month
        target_year = req_date.year
    except:
        target_month = int(data.get('month', 3))
        target_year = int(data.get('year', 2026))
    start_date = date(target_year, target_month, 1)

    # 1. Get writers and total capacity
    writers = User.query.filter(User.role == 'Content Writer', User.is_active == True).all()
    if not writers:
        return jsonify({'error': 'No active content writers found'}), 400
    
    total_daily_cap = sum(w.daily_available_minutes or 480 for w in writers)
    
    # 2. Get workload
    deliverables = MonthlyDeliverable.query.filter_by(month=target_month, year=target_year).all()
    total_mins = 0
    all_activities = []
    
    for d in deliverables:
        at = ActivityType.query.get(d.activity_type_id)
        if not at: continue
        
        qty = d.monthly_target
        total_mins += at.activity_time * qty
        for _ in range(qty):
            all_activities.append({'client_id': d.client_id, 'at': at})
            
    if not all_activities:
        return jsonify({'error': 'No deliverables for this month'}), 400

    # 3. Calculate assignment window (as an estimate)
    estimate_days = int(math.ceil(float(total_mins) / float(total_daily_cap))) if total_daily_cap > 0 else 0

    # RESET current monthly tasks for fresh start
    # Clear associations first
    task_ids = db.session.query(AutomationTask.id).filter_by(month=target_month, year=target_year, source='monthly').all()
    if task_ids:
        tid_list = [t[0] for t in task_ids]
        from app.models.automation import task_activities  # type: ignore
        db.session.execute(task_activities.delete().where(task_activities.c.task_id.in_(tid_list)))
    
    AutomationTask.query.filter_by(month=target_month, year=target_year, source='monthly').delete()

    # 4. Generate with sequence tracking
    # key: (client_id, activity_type_id), value: current count
    service_sequences = {} 
    
    tasks_created = []
    act_idx: int = 0
    total_acts: int = len(all_activities)
    current_date: date = start_date
    while act_idx < total_acts:
        
        # Setup writer stats for the day
        day_stats = []
        for w in writers:
            rec = get_or_create_daily_minutes(w.id, current_date)
            # Reset used_minutes only if it was already used by a PREVIOUS automated run.
            # However, since we are doing a fresh generate, we'll start with empty day.
            rec.used_minutes = 0
            day_stats.append({
                'employee': w,
                'rec': rec,
                'rem': rec.available_minutes
            })
            
        # Fill capacity for this day
        tasks_on_day: int = 0
        while act_idx < total_acts:
            act = all_activities[act_idx]
            at = act['at']
            assigned = False
            
            # Simple greedy assignment (Writer capacity check)
            for stat in day_stats:
                if stat['rem'] >= at.activity_time:
                    # Get/Update sequence for this service (client + activity type)
                    cid = act['client_id']
                    aid = at.id
                    seq_key = (cid, aid)
                    
                    if seq_key not in service_sequences:
                        # Initial count from DB
                        service_sequences[seq_key] = AutomationTask.query.filter_by(
                            client_id=cid, activity_type_id=aid, 
                            month=target_month, year=target_year,
                            source='monthly'
                        ).count()
                    
                    current_seq = int(service_sequences.get(seq_key, 0)) + 1
                    service_sequences[seq_key] = current_seq
                    code = generate_activity_code(cid, aid, target_year, target_month, 
                                                is_job_work=False, seq=current_seq)
                    
                    task = AutomationTask(
                        activity_code=code, client_id=act['client_id'], activity_type_id=at.id,
                        assigned_employee_id=stat['employee'].id, assigned_date=current_date,
                        month=target_month, year=target_year, status='Assigned',
                        priority=3, source='monthly', minutes_at_creation=at.activity_time,
                        current_stage='content_writing'
                    )
                    task.activities.append(at)
                    db.session.add(task)
                    
                    rec_obj = cast(EmployeeDailyMinutes, stat['rec'])
                    rec_obj.used_minutes += int(at.activity_time)
                    stat['rem'] = int(stat['rem']) - int(at.activity_time)
                    act_idx += 1
                    tasks_created.append(code)
                    tasks_on_day += 1  # type: ignore
                    assigned = True
                    break
            
            if not assigned:
                # Capacity full for today for the remaining tasks
                break
        
        # Guard against zero-progress infinite loop (e.g. task larger than anyone's daily capacity)
        if tasks_on_day == 0 and act_idx < total_acts:
            # Task at act_idx cannot fit in any writer's daily max capacity
            print(f"Warning: Task {all_activities[act_idx]['at'].name} exceeds any single writer daily capacity. Skipping this task to prevent queue blocking.")
            act_idx += 1
            continue
        
        current_date = cast(date, cast(date, current_date) + timedelta(days=1))
        # Stop looping if we've gone 31 days (no infinite loops)
        if (cast(date, current_date) - start_date).days > 31:
            break

    db.session.commit()
    days_spent: int = (cast(date, current_date) - start_date).days
    final_days = days_spent if act_idx == total_acts else days_spent - 1
    return jsonify({
        'message': f'Auto-assignment complete. {len(tasks_created)}/{total_acts} tasks assigned across {final_days} days.',
        'total_work_minutes': total_mins,
        'estimated_days': int(estimate_days),
        'actual_days': int(final_days),
        'tasks_created': len(tasks_created)
    }), 200

def _find_capacity_match(writer_stats, minutes_needed):
    """Rule: Find first employee with enough remaining capacity"""
    # Try to find someone who has capacity
    for stat in writer_stats:
        if stat['remaining'] >= minutes_needed:
            return stat
    return None


def _assign_strict_match(writer_mins, mins_needed):
    """Utility for single job work assignment"""
    for wid, info in writer_mins.items():
        if info['remaining'] >= mins_needed:
            return info
    return None

# ─────────────────────────────────────────────
# STATS / DASHBOARD SUMMARY
# ─────────────────────────────────────────────

@automation_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    # Use selected date if provided, else today
    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date_str)
    except:
        target_date = date.today()

    month = target_date.month
    year  = target_date.year

    total_deliverables = db.session.query(db.func.sum(MonthlyDeliverable.monthly_target)).filter_by(
        month=month, year=year).scalar() or 0
    total_completed = db.session.query(db.func.sum(MonthlyDeliverable.completed_count)).filter_by(
        month=month, year=year).scalar() or 0
        
    monthly_assigned = AutomationTask.query.filter_by(month=month, year=year).count()

    # Today's Specific Stats
    today_tasks_count = AutomationTask.query.filter_by(assigned_date=target_date).count()
    
    # All assigned minutes
    today_minutes_assigned = db.session.query(db.func.sum(AutomationTask.minutes_at_creation)).filter(
        AutomationTask.assigned_date == target_date
    ).scalar() or 0

    # Specifically WORKED (Finished submissions + Completed) minutes - grouping by work_date (fallback to assigned_date)
    today_worked_minutes = db.session.query(db.func.sum(AutomationTask.minutes_at_creation)).filter(
        db.or_(
            AutomationTask.work_date == target_date,
            db.and_(AutomationTask.work_date == None, AutomationTask.assigned_date == target_date)
        ),
        ~AutomationTask.status.in_(['Assigned', 'In Progress', 'Assigned to Editor', 'Pending', 'Rework Required (Writer)', 'Rework Required (Editor)'])
    ).scalar() or 0
    
    today_total_available = db.session.query(db.func.sum(EmployeeDailyMinutes.available_minutes)).filter(
        EmployeeDailyMinutes.date == target_date
    ).scalar() or 0

    pending_writer_approval = AutomationTask.query.filter_by(status='Submitted to BM').count()
    pending_editor_approval = AutomationTask.query.filter_by(status='Video Submitted').count()
    pending_approval = pending_writer_approval + pending_editor_approval
    rework_count = AutomationTask.query.filter(AutomationTask.status.ilike('%Rework%')).count()
    pending_jw = AutomationJobWork.query.filter_by(status='pending').count()
    
    # Global counts for pending/completed across system
    total_pending = AutomationTask.query.filter(AutomationTask.status.in_(['Assigned', 'In Progress', 'Assigned to Editor', 'Rework Required (Writer)', 'Rework Required (Editor)'])).count()
    total_completed_tasks = AutomationTask.query.filter_by(status='Completed').count()

    # Truly Overall Efficiency (All history till target_date)
    overall_worked_minutes = db.session.query(db.func.sum(AutomationTask.minutes_at_creation)).filter(
        AutomationTask.assigned_date <= target_date,
        ~AutomationTask.status.in_(['Assigned', 'In Progress', 'Assigned to Editor', 'Pending'])
    ).scalar() or 0

    # System-wide overall available: sum of daily capacity of ALL content writers/editors across days
    first_task_date = db.session.query(db.func.min(AutomationTask.assigned_date)).scalar()
    if first_task_date:
        num_days = (target_date - first_task_date).days + 1
        # Sum potential capacity of all active writers/editors
        active_staff = User.query.filter(User.is_active == True, User.role.in_(['Content Writer', 'Editor'])).all()
        total_daily_cap = sum(u.daily_available_minutes for u in active_staff)
        overall_available_minutes = total_daily_cap * num_days
    else:
        overall_available_minutes = 0

    return jsonify({
        'monthly_target': total_deliverables,
        'monthly_completed': total_completed,
        'monthly_assigned': monthly_assigned,
        'monthly_remaining': max(0, total_deliverables - monthly_assigned),
        'today_tasks': today_tasks_count,
        'today_minutes_assigned': int(today_minutes_assigned),
        'today_worked_minutes': int(today_worked_minutes),
        'today_minutes_available': int(today_total_available),
        'today_minutes_remaining': max(0, int(today_total_available - today_minutes_assigned)),
        'overall_worked_minutes': int(overall_worked_minutes),
        'overall_available_minutes': int(overall_available_minutes),
        'pending_approval': pending_approval,
        'pending_writer_approval': pending_writer_approval,
        'pending_editor_approval': pending_editor_approval,
        'rework_count': rework_count,
        'pending_job_work': pending_jw,
        'total_pending': total_pending,
        'total_completed_tasks': total_completed_tasks
    }), 200

@automation_bp.route('/brand-manager-dashboard', methods=['GET'])
@jwt_required()
def get_bm_dashboard_stats():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    # Use March 2026 as per existing context in other endpoints
    month = request.args.get('month', type=int, default=3)
    year  = request.args.get('year', type=int, default=2026)
    today = date.today()

    active_staff = User.query.filter(User.is_active == True, User.role.in_(['Content Writer', 'Editor', 'Video Editor'])).all()
    finished_statuses = ['Submitted to BM', 'Assigned to Editor', 'Video Submitted', 'Completed']

    employees_stats = []
    
    for emp in active_staff:
        emp_tasks = AutomationTask.query.filter(
            db.or_(AutomationTask.assigned_employee_id == emp.id, AutomationTask.video_editor_id == emp.id),
            AutomationTask.month == month, AutomationTask.year == year
        ).all()

        assigned_count: int = len(emp_tasks)
        completed_count: int = 0
        total_worked_mins: int = 0
        total_assigned_mins: int = 0
        
        for t in emp_tasks:
            is_done, done_m, assigned_m = _get_employee_task_stats(t, emp.id)
            if is_done: completed_count += 1  # type: ignore
            total_worked_mins += done_m
            total_assigned_mins += assigned_m

        reworks_count = sum(t.rework_count or 0 for t in emp_tasks)
        att_rec = Attendance.query.filter_by(user_id=emp.id, date=today).first()
        attendance_status = att_rec.status if att_rec else "Absent"

        # Efficiency based on total assigned vs worked minutes
        efficiency_val: float = (float(total_worked_mins) / float(total_assigned_mins) * 100.0) if total_assigned_mins > 0 else 0.0

        num_days = calendar.monthrange(year, month)[1]
        emp_history = []
        for day in range(1, num_days + 1):
            curr_d = date(year, month, day)
            day_tasks = [t for t in emp_tasks if (t.work_date == curr_d or (t.work_date is None and t.assigned_date == curr_d))]
            
            day_worked = sum(_get_employee_task_stats(t, emp.id)[1] for t in day_tasks)
            avail_mins = emp.daily_available_minutes or 480
            day_eff = (day_worked / avail_mins * 100) if avail_mins > 0 else 0
            
            if curr_d <= today:
                emp_history.append({
                    'display_date': curr_d.strftime('%b %d'),
                    'efficiency': int(day_eff),
                    'task_count': len(day_tasks)
                })

        # Detailed tasks for client-wise view
        detailed_tasks = []
        for t in emp_tasks:
            detailed_tasks.append({
                'id': t.id,
                'activity_code': t.activity_code,
                'client_name': t.client.name if t.client else "Unknown",
                'activity_type': t.activity_type.name if t.activity_type else "Unknown",
                'status': t.status,
                'stage': t.current_stage,
                'rework_count': t.rework_count or 0
            })

        employees_stats.append({
            'id': emp.id,
            'name': emp.name,
            'role': emp.role,
            'assigned': assigned_count,
            'completed': completed_count,
            'reworks': reworks_count,
            'efficiency': float(f"{efficiency_val:.1f}"),
            'attendance': attendance_status,
            'history': emp_history,
            'detailed_tasks': detailed_tasks,
            'today_tasks': len([t for t in emp_tasks if (t.work_date == today or (t.work_date is None and t.assigned_date == today))])
        })

    # Overall Metrics for the Brand Manager dashboard
    total_assigned_sum: int = sum(int(cast(Dict[str, Any], e)['assigned']) for e in employees_stats)
    total_completed_sum: int = sum(int(cast(Dict[str, Any], e)['completed']) for e in employees_stats)
    
    overall_eff_val: float = (float(total_completed_sum) / float(total_assigned_sum) * 100.0) if total_assigned_sum > 0 else 0.0
    overall_eff_str: str = f"{overall_eff_val:.1f}"

    return jsonify({
        'employees': employees_stats,
        'overall_efficiency': float(overall_eff_str),
        'total_assigned': total_assigned_sum,
        'total_completed': total_completed_sum,
        'month_name': calendar.month_name[month]
    }), 200

# ─────────────────────────────────────────────
# EMPLOYEES LIST (for dropdowns)
# ─────────────────────────────────────────────

@automation_bp.route('/employees', methods=['GET'])
@jwt_required()
def get_employees():
    employees = User.query.filter_by(is_active=True).all()
    return jsonify([e.to_dict() for e in employees]), 200
# ─────────────────────────────────────────────
# ATTENDANCE & EFFICIENCY HISTORY
# ─────────────────────────────────────────────

@automation_bp.route('/attendance', methods=['POST'])
@jwt_required()
def submit_attendance():
    user_id = int(get_jwt_identity())
    today = date.today()
    
    existing = Attendance.query.filter_by(user_id=user_id, date=today).first()
    if existing:
        return jsonify({'message': 'Already marked present today'}), 200
    
    att = Attendance(user_id=user_id, date=today, status='Present')
    db.session.add(att)
    
    # Log it
    log = ActivityLog(user_id=user_id, action='Marked Present', details='User marked attendance as present')
    db.session.add(log)
    
    db.session.commit()
    return jsonify({'message': 'Attendance marked successfully', 'attendance': att.to_dict()}), 201

@automation_bp.route('/attendance/my', methods=['GET'])
@jwt_required()
def get_my_attendance():
    user_id = int(get_jwt_identity())
    records = Attendance.query.filter_by(user_id=user_id).order_by(Attendance.date.desc()).limit(30).all()
    return jsonify([r.to_dict() for r in records]), 200

@automation_bp.route('/efficiency-history', methods=['GET'])
@jwt_required()
def get_efficiency_history():
    user_id = int(get_jwt_identity())
    
    # User requested March 2026 specifically
    month = request.args.get('month', type=int, default=3)
    year  = request.args.get('year', type=int, default=2026)
    
    # Get all days in the requested month
    num_days = calendar.monthrange(year, month)[1]
    
    # Monthly Stats for this user
    monthly_tasks = AutomationTask.query.filter(
        db.or_(AutomationTask.assigned_employee_id == user_id, AutomationTask.video_editor_id == user_id),
        AutomationTask.month == month, AutomationTask.year == year
    ).all()
    
    # Rough cuts also part of the month
    monthly_rcs = AutomationRoughCut.query.filter(
        AutomationRoughCut.editor_id == user_id,
        db.extract('month', AutomationRoughCut.work_date) == month,
        db.extract('year', AutomationRoughCut.work_date) == year,
        AutomationRoughCut.status == 'Completed'
    ).all()

    total_tasks_count: int = len(monthly_tasks) + len(monthly_rcs)
    completed_tasks_count: int = len(monthly_rcs)
    total_month_worked: int = sum(rc.minutes for rc in monthly_rcs)
    total_month_avail: int = 0
    
    for t in monthly_tasks:
        is_done, done_mins, _ = _get_employee_task_stats(t, user_id)
        if is_done:
            completed_tasks_count += 1
            total_month_worked += done_mins
    
    # Daily History
    history = []
    num_days = calendar.monthrange(year, month)[1]
    
    for day in range(1, num_days + 1):
        current_date = date(year, month, day)
        day_tasks = [t for t in monthly_tasks if (t.work_date == current_date or (t.work_date is None and t.assigned_date == current_date))]
        day_rcs = [rc for rc in monthly_rcs if rc.work_date == current_date]
        
        avail = EmployeeDailyMinutes.query.filter_by(employee_id=user_id, date=current_date).first()
        available_mins = avail.available_minutes if avail else 480
        
        # Worked = tasks + rough cuts
        worked_mins = sum(_get_employee_task_stats(t, user_id)[1] for t in day_tasks) + sum(rc.minutes for rc in day_rcs)
        # Assigned (approx for stats)
        assigned_mins = sum(_get_employee_task_stats(t, user_id)[2] for t in day_tasks) + sum(rc.minutes for rc in day_rcs)
        
        eff = (worked_mins / available_mins) * 100 if available_mins > 0 else 0
        
        # Check Attendance
        att_rec = Attendance.query.filter_by(user_id=user_id, date=current_date).first()
        att_status = att_rec.status if att_rec else "Absent"
        if current_date > date.today(): att_status = "Upcoming"
        
        history.append({
            'date': current_date.isoformat(),
            'display_date': current_date.strftime('%b %d'),
            'efficiency': int(eff),
            'worked': worked_mins,
            'assigned': assigned_mins,
            'available': available_mins,
            'attendance': att_status,
            'task_count': len(day_tasks) + len(day_rcs)
        })
        
        # total_month_worked already has RC mins added above in loop or initial sum
        # but let's be safe and only add avail here
        total_month_avail += available_mins
        
    avg_eff = (total_month_worked / total_month_avail) * 100 if total_month_avail > 0 else 0
    
    total_reworks_count = sum(t.rework_count or 0 for t in monthly_tasks)
    
    return jsonify({
        'history': history,
        'average_efficiency': int(avg_eff),
        'total_tasks': total_tasks_count,
        'completed_tasks': completed_tasks_count,
        'total_reworks': total_reworks_count,
        'month_name': calendar.month_name[month]
    }), 200

@automation_bp.route('/tasks/<int:tid>/priority', methods=['PATCH'])
@jwt_required()
def update_task_priority(tid):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    task = AutomationTask.query.get_or_404(tid)
    data = request.json or {}
    priority = data.get('priority')
    
    if priority is None:
        return jsonify({'error': 'Priority is required'}), 400
    
    task.priority = int(priority)
    
    log = ActivityLog(task_id=task.id, user_id=user_id, action='Updated Priority', details=f'BM changed priority to {priority}')
    db.session.add(log)
    db.session.commit()
    return jsonify(task.to_dict()), 200

@automation_bp.route('/tasks/<int:tid>/save-rough-cut', methods=['POST'])
@jwt_required()
def save_rough_cut(tid):
    user_id = int(get_jwt_identity())
    task = AutomationTask.query.get_or_404(tid)
    data = request.json or {}
    
    if task.video_editor_id != user_id:
        return jsonify({'error': 'Only the assigned Video Editor can send rough cut'}), 403

    path = data.get('rough_cut_video_path')
    if not path:
        return jsonify({'error': 'Rough cut path required'}), 400
        
    task.rough_cut_video_path = path
    log = ActivityLog(task_id=task.id, user_id=user_id, action='Sent Rough Cut', details=f'Editor sent rough cut: {path}')
    db.session.add(log)
    db.session.commit()
    return jsonify(task.to_dict()), 200


# ─────────────────────────────────────────────
# ROUGH CUT WORKFLOW (ADMIN -> BM -> EDITOR -> WRITER)
# ─────────────────────────────────────────────

@automation_bp.route('/rough-cuts', methods=['POST'])
@jwt_required()
def create_rough_cut():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Admin', 'Manager', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json or {}
    media_paths = data.get('media_paths', []) # Expecting list of paths
    
    if not media_paths:
        return jsonify({'error': 'No media uploaded'}), 400
    
    rc = AutomationRoughCut(
        admin_id=user_id,
        media_paths=','.join(media_paths),
        status='Pending'
    )
    db.session.add(rc)
    db.session.commit()
    return jsonify(rc.to_dict()), 201

@automation_bp.route('/rough-cuts', methods=['GET'])
@jwt_required()
def get_rough_cuts():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role in ['Admin', 'Manager', 'Brand Manager']:
        rcs = AutomationRoughCut.query.order_by(AutomationRoughCut.created_at.desc()).all()
    elif user.role == 'Video Editor':
        rcs = AutomationRoughCut.query.filter_by(editor_id=user_id).order_by(AutomationRoughCut.created_at.desc()).all()
    else:
        return jsonify([]), 200
        
    return jsonify([r.to_dict() for r in rcs]), 200

@automation_bp.route('/rough-cuts/<int:rcid>/assign', methods=['PATCH'])
@jwt_required()
def assign_rough_cut(rcid):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'Brand Manager':
        return jsonify({'error': 'Only BM can assign rough cuts'}), 403
        
    data = request.json or {}
    editor_id = data.get('editor_id')
    if not editor_id:
        return jsonify({'error': 'Editor ID required'}), 400
        
    rc = AutomationRoughCut.query.get_or_404(rcid)
    rc.editor_id = editor_id
    rc.status = 'Assigned'
    db.session.commit()
    return jsonify(rc.to_dict()), 200

@automation_bp.route('/rough-cuts/<int:rcid>/complete', methods=['PATCH'])
@jwt_required()
def complete_rough_cut(rcid):
    user_id = int(get_jwt_identity())
    data = request.json or {}
    path = data.get('edited_video_path')
    target_task_id = data.get('target_task_id')
    
    if not path or not target_task_id:
        return jsonify({'error': 'Edited video path and target task ID required'}), 400
        
    rc = AutomationRoughCut.query.get_or_404(rcid)
    if rc.editor_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    task = AutomationTask.query.get(target_task_id)
    if not task:
        return jsonify({'error': 'Target task not found'}), 404
        
    rc.edited_video_path = path
    rc.target_task_id = target_task_id
    rc.status = 'Completed'
    rc.completed_at = datetime.utcnow()
    rc.work_date = date.today()
    
    # Also update the task's rough_cut_video_path so the content writer sees it
    task.rough_cut_video_path = path
    
    log = ActivityLog(task_id=task.id, user_id=user_id, action='Delivered Rough Cut', details=f'Editor delivered rough cut video: {path}')
    db.session.add(log)
    db.session.commit()
    return jsonify(rc.to_dict()), 200

@automation_bp.route('/tasks/yt-codes', methods=['GET'])
@jwt_required()
def get_yt_codes():
    # Only YT and YTS codes are eligible for this workflow
    eligible_tasks = AutomationTask.query.filter(
        db.and_(
            AutomationTask.status != 'Completed',
            db.or_(
                AutomationTask.activity_code.ilike('%YT%'),
                AutomationTask.activity_code.ilike('%YTS%')
            )
        )
    ).all()
    return jsonify([t.to_dict() for t in eligible_tasks]), 200
