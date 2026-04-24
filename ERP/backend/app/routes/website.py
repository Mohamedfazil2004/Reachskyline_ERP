from flask import Blueprint, request, jsonify  # type: ignore
from flask_jwt_extended import jwt_required, get_jwt_identity  # type: ignore
from datetime import datetime, date, timedelta
import calendar
from app.extensions import db  # type: ignore
from app.models.website_team import WebsiteTask, WebsiteActivity
from app.models.automation import Attendance, ActivityLog  # type: ignore
from app.models.user import User  # type: ignore
from app.models.master import Client  # type: ignore
from typing import Dict, List, Any, cast

website_bp = Blueprint('website', __name__)

DAILY_CAPACITY = 480

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def require_website_head():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'Website Head':
        return None, (jsonify({'error': 'Unauthorized — Website Head only'}), 403)
    return user, None

def require_website_member():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['Website Head', 'Website Employee']:
        return None, (jsonify({'error': 'Unauthorized'}), 403)
    return user, None


# ─── MASTER: WEBSITE ACTIVITIES ─────────────────────────────────────────────

@website_bp.route('/activities', methods=['GET'])
@jwt_required()
def get_activities():
    acts = WebsiteActivity.query.filter_by(is_active=True).order_by(
        WebsiteActivity.activity, WebsiteActivity.activity_type
    ).all()
    return jsonify([a.to_dict() for a in acts]), 200


@website_bp.route('/activities', methods=['POST'])
@jwt_required()
def create_activity():
    user, err = require_website_head()
    if err: return err
    data = request.json or {}
    a = WebsiteActivity(
        activity=data.get('activity', ''),
        activity_type=data.get('activity_type', ''),
        standard_minutes=int(data.get('standard_minutes', 30))
    )
    db.session.add(a)
    db.session.commit()
    return jsonify(a.to_dict()), 201


# ─── TASK CRUD ───────────────────────────────────────────────────────────────

@website_bp.route('/tasks', methods=['POST'])
@jwt_required()
def create_task():
    """Website Head assigns task(s) to an employee."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ['Website Head', 'Admin', 'Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.json or {}

    try:
        task_date = date.fromisoformat(data.get('date', date.today().isoformat()))
    except:
        task_date = date.today()

    assigned_to = data.get('assigned_to')
    if not assigned_to:
        return jsonify({'error': 'assigned_to is required'}), 400

    if data.get('activity_id'):
        act_id = int(cast(Any, data.get('activity_id')))
        act = WebsiteActivity.query.get(act_id)
        if not act:
            return jsonify({'error': 'Invalid activity_id'}), 404
    else:
        act_id = None

    task = WebsiteTask(
        date=task_date,
        assigned_by=user_id,
        assigned_to=int(assigned_to),
        client_id=data.get('client_id') or None,
        task_description=data.get('task_description', ''),
        activity_id=act_id,
        minutes=int(data.get('minutes', 30)),
        status='Pending'
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@website_bp.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    """
    Website Head: sees all tasks (filtered by date/employee).
    Website Employee: sees only their tasks.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date_str)
    except:
        target_date = date.today()

    employee_id_filter = request.args.get('employee_id', type=int)

    strict = request.args.get('strict', 'false').lower() == 'true'
    
    if user.role in ['Website Head', 'Admin', 'Manager']:
        q = WebsiteTask.query
        if employee_id_filter:
            q = q.filter(WebsiteTask.assigned_to == employee_id_filter)
        
        if strict:
            q = q.filter(WebsiteTask.date == target_date)
        else:
            q = q.filter(db.or_(
                WebsiteTask.date == target_date,
                db.and_(WebsiteTask.date < target_date, WebsiteTask.status != 'Completed')
            ))
        tasks = q.order_by(WebsiteTask.date.desc(), WebsiteTask.assigned_to, WebsiteTask.id).all()
    else:
        # Employee view
        if strict:
            tasks = WebsiteTask.query.filter_by(assigned_to=user_id, date=target_date).order_by(WebsiteTask.id).all()
        else:
            # Full list including unresolved past tasks
            tasks = WebsiteTask.query.filter(
                WebsiteTask.assigned_to == user_id,
                db.or_(
                    WebsiteTask.date == target_date,
                    db.and_(WebsiteTask.date < target_date, WebsiteTask.status != 'Completed')
                )
            ).order_by(WebsiteTask.date.desc(), WebsiteTask.id).all()

    return jsonify([t.to_dict() for t in tasks]), 200


@website_bp.route('/tasks/<int:tid>', methods=['PATCH'])
@jwt_required()
def update_task(tid):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    task = WebsiteTask.query.get_or_404(tid)
    data = request.json or {}

    # Head can update anything
    if user.role in ['Website Head', 'Admin', 'Manager']:
        if 'date' in data:
            try: task.date = date.fromisoformat(data['date'])
            except: pass
        if 'assigned_to' in data:
            task.assigned_to = int(data['assigned_to'])
        if 'client_id' in data:
            task.client_id = data['client_id'] or None
        if 'task_description' in data:
            task.task_description = data['task_description']
        if 'activity_id' in data:
            task.activity_id = int(data['activity_id']) if data['activity_id'] else None
        if 'minutes' in data:
            task.minutes = int(data['minutes'])
        if 'status' in data:
            action = data['status']
            if action == 'Completed':
                task.status = 'Completed'
            elif action == 'Rework':
                if not data.get('rework_reason'):
                    return jsonify({'error': 'Rework reason is required'}), 400
                task.status = 'Rework'
                task.rework_reason = data['rework_reason']
                task.rework_count = (task.rework_count or 0) + 1

    elif task.assigned_to == user_id:
        # Employee can update: status (In Progress, Waiting for Approval) and work_link
        if 'status' in data and data['status'] in ['In Progress', 'Waiting for Approval']:
            task.status = data['status']
        if 'work_link' in data:
            task.work_link = data['work_link']
    else:
        return jsonify({'error': 'Unauthorized'}), 403

    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(task.to_dict()), 200


@website_bp.route('/tasks/<int:tid>', methods=['DELETE'])
@jwt_required()
def delete_task(tid):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Website Head', 'Admin', 'Manager']:
        return jsonify({'error': 'Unauthorized'}), 403
    task = WebsiteTask.query.get_or_404(tid)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200


# ─── EMPLOYEES LIST (for head dropdown) ──────────────────────────────────────

@website_bp.route('/employees', methods=['GET'])
@jwt_required()
def get_website_employees():
    employees = User.query.filter(
        User.role.in_(['Website Employee']),
        User.is_active == True
    ).order_by(User.name).all()
    return jsonify([{
        'id': e.id,
        'name': e.name,
        'email': e.email,
        'daily_available_minutes': e.daily_available_minutes or 480
    } for e in employees]), 200


# ─── EFFICIENCY / DASHBOARD ──────────────────────────────────────────────────

@website_bp.route('/efficiency', methods=['GET'])
@jwt_required()
def get_efficiency():
    """Personal efficiency history for a website employee."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    # Allow head to check any employee via ?employee_id=
    target_id = request.args.get('employee_id', type=int, default=user_id)
    if user.role not in ['Website Head', 'Admin', 'Manager'] and target_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    month = request.args.get('month', type=int, default=date.today().month)
    year = request.args.get('year', type=int, default=date.today().year)

    num_days = calendar.monthrange(year, month)[1]
    today = date.today()

    target_user = User.query.get(target_id)
    daily_cap = target_user.daily_available_minutes if (target_user and target_user.daily_available_minutes) else DAILY_CAPACITY

    all_tasks = WebsiteTask.query.filter(
        WebsiteTask.assigned_to == target_id,
        db.extract('month', WebsiteTask.date) == month,
        db.extract('year', WebsiteTask.date) == year
    ).all()

    attendance_records = Attendance.query.filter(
        Attendance.user_id == target_id,
        db.extract('month', Attendance.date) == month,
        db.extract('year', Attendance.date) == year
    ).all()
    att_dates = {r.date for r in attendance_records}

    history = []
    total_worked: int = 0
    total_avail: int = 0
    total_tasks = len(all_tasks)
    completed_tasks = len([t for t in all_tasks if t.status == 'Completed'])
    total_reworks = sum(t.rework_count or 0 for t in all_tasks)

    for day in range(1, num_days + 1):
        curr_d = date(year, month, day)
        day_tasks = [t for t in all_tasks if t.date == curr_d]
        worked_mins = sum(t.minutes for t in day_tasks if t.status == 'Completed')
        assigned_mins = sum(t.minutes for t in day_tasks)
        eff = (float(worked_mins) / float(daily_cap) * 100.0) if daily_cap > 0 else 0.0

        att = 'Upcoming' if curr_d > today else ('Present' if curr_d in att_dates or day_tasks else 'Absent')

        entry = {
            'date': curr_d.isoformat(),
            'display_date': curr_d.strftime('%b %d'),
            'efficiency': int(float(eff)),
            'worked': worked_mins,
            'assigned': assigned_mins,
            'available': daily_cap,
            'task_count': len(day_tasks),
            'attendance': att
        }
        history.append(entry)
        if curr_d <= today:
            total_worked = int(total_worked) + int(worked_mins)  # type: ignore
            total_avail = int(total_avail) + int(daily_cap)  # type: ignore

    avg_eff = int(float(total_worked) / float(total_avail) * 100.0) if total_avail > 0 else 0  # type: ignore

    return jsonify({
        'history': history,
        'average_efficiency': avg_eff,
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'total_reworks': total_reworks,
        'month_name': calendar.month_name[month]
    }), 200


@website_bp.route('/mark-present', methods=['POST'])
@jwt_required()
def mark_present():
    user_id = int(get_jwt_identity())
    today = date.today()
    
    existing = Attendance.query.filter_by(user_id=user_id, date=today).first()
    if existing:
        return jsonify({'message': 'Already marked present today'}), 200
        
    att = Attendance(user_id=user_id, date=today, status='Present')
    db.session.add(att)
    
    log = ActivityLog(user_id=user_id, action='Marked Present', details='Website Employee marked attendance as present')
    db.session.add(log)
    
    db.session.commit()
    return jsonify({'message': 'Attendance marked successfully', 'attendance': att.to_dict()}), 201


@website_bp.route('/head-overview', methods=['GET'])
@jwt_required()
def head_overview():
    """Website Head Dashboard: Overall team stats and per-employee monthly summaries."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Website Head', 'Admin', 'Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    month = request.args.get('month', type=int, default=date.today().month)
    year = request.args.get('year', type=int, default=date.today().year)
    target_date_str = request.args.get('date', date.today().isoformat())
    target_date = date.fromisoformat(target_date_str)

    employees = User.query.filter(
        User.role == 'Website Employee',
        User.is_active == True
    ).all()

    team_stats: Dict[str, Any] = {
        'total_tasks_today': 0,
        'approved_today': 0,
        'pending_today': 0,
        'team_efficiency_month': 0,
        'employee_stats': []
    }

    total_worked_month: int = 0
    total_avail_month: int = 0

    for emp in employees:
        # Today's stats
        today_tasks = WebsiteTask.query.filter(
            WebsiteTask.assigned_to == emp.id,
            WebsiteTask.date == target_date
        ).all()
        team_stats['total_tasks_today'] = int(team_stats['total_tasks_today']) + len(today_tasks)
        team_stats['approved_today'] = int(team_stats['approved_today']) + len([t for t in today_tasks if t.status == 'Completed'])
        team_stats['pending_today'] = int(team_stats['pending_today']) + len([t for t in today_tasks if t.status in ['Pending', 'In Progress', 'Waiting for Approval', 'Rework']])

        # Monthly stats for this employee
        month_tasks = WebsiteTask.query.filter(
            WebsiteTask.assigned_to == emp.id,
            db.extract('month', WebsiteTask.date) == month,
            db.extract('year', WebsiteTask.date) == year
        ).all()

        emp_worked = sum(t.minutes for t in month_tasks if t.status == 'Completed')
        # Simplified capacity calc for the month (working days until today)
        num_days = date.today().day if month == date.today().month else calendar.monthrange(year, month)[1]
        emp_avail = (emp.daily_available_minutes if emp.daily_available_minutes else DAILY_CAPACITY) * num_days
        
        emp_eff = (emp_worked / emp_avail * 100) if emp_avail > 0 else 0
        
        total_worked_month += emp_worked
        total_avail_month += emp_avail

        cast(List[Any], team_stats['employee_stats']).append({
            'id': emp.id,
            'name': emp.name,
            'email': emp.email,
            'monthly_efficiency': int(emp_eff),
            'tasks_count': len(month_tasks),
            'approved_count': len([t for t in month_tasks if t.status == 'Completed'])
        })

    team_stats['team_efficiency_month'] = int(float(total_worked_month) / float(total_avail_month) * 100.0) if total_avail_month > 0 else 0
    return jsonify(team_stats), 200


@website_bp.route('/head-dashboard', methods=['GET'])
@jwt_required()
def head_dashboard():
    """Website Head overview: per-employee stats for selected date."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ['Website Head', 'Admin', 'Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = date.fromisoformat(target_date_str)
    except:
        target_date = date.today()

    employees = User.query.filter(
        User.role == 'Website Employee',
        User.is_active == True
    ).all()

    stats = []
    for emp in employees:
        # Show tasks for target_date OR past unresolved tasks (Waiting for Approval/In Progress/Pending/Rework)
        emp_tasks = WebsiteTask.query.filter(
            WebsiteTask.assigned_to == emp.id,
            db.or_(
                WebsiteTask.date == target_date,
                db.and_(WebsiteTask.date < target_date, WebsiteTask.status != 'Completed')
            )
        ).order_by(WebsiteTask.date.desc(), WebsiteTask.id).all()
        total_mins = sum(t.minutes for t in emp_tasks)
        approved_mins = sum(t.minutes for t in emp_tasks if t.status == 'Completed')
        
        # Use employee's own daily capacity for efficiency
        emp_daily_cap = emp.daily_available_minutes if emp.daily_available_minutes else DAILY_CAPACITY
        eff = int(float(approved_mins) / float(emp_daily_cap) * 100.0) if emp_daily_cap > 0 else 0

        stats.append({
            'id': emp.id,
            'name': emp.name,
            'total_tasks': len(emp_tasks),
            'approved': len([t for t in emp_tasks if t.status == 'Completed']),
            'pending': len([t for t in emp_tasks if t.status in ['Pending', 'In Progress', 'Waiting for Approval', 'Rework']]),
            'total_minutes': total_mins,
            'approved_minutes': approved_mins,
            'efficiency': eff,
            'tasks': [t.to_dict() for t in emp_tasks]
        })

    return jsonify({'date': target_date.isoformat(), 'employees': stats}), 200
