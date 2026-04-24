from app.extensions import db
from datetime import datetime, date


class MonthlyDeliverable(db.Model):
    __tablename__ = 'monthly_deliverables'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    activity_type_id = db.Column(db.Integer, db.ForeignKey('activity_types.id'), nullable=False)
    month = db.Column(db.Integer, nullable=False)   # 1-12
    year = db.Column(db.Integer, nullable=False)
    monthly_target = db.Column(db.Integer, default=0)
    completed_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    client = db.relationship('Client', backref=db.backref('sm_deliverables', lazy=True, passive_deletes=True))
    activity_type = db.relationship('ActivityType', backref=db.backref('sm_deliverables', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('client_id', 'activity_type_id', 'month', 'year', name='uq_deliverable'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'client_name': self.client.name if self.client else None,
            'activity_type_id': self.activity_type_id,
            'activity_type_name': self.activity_type.name if self.activity_type else None,
            'activity_code_letter': self.activity_type.code_letter if self.activity_type else None,
            'month': self.month,
            'year': self.year,
            'monthly_target': self.monthly_target,
            'completed_count': self.completed_count,
            'remaining': max(0, self.monthly_target - self.completed_count),
        }


class EmployeeDailyMinutes(db.Model):
    __tablename__ = 'employee_daily_minutes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    available_minutes = db.Column(db.Integer, default=480)
    used_minutes = db.Column(db.Integer, default=0)

    employee = db.relationship('User', backref=db.backref('daily_minutes', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('employee_id', 'date', name='uq_emp_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.name if self.employee else None,
            'employee_eid': self.employee.employee_id if self.employee else None,
            'role': self.employee.role if self.employee else None,
            'date': self.date.isoformat(),
            'available_minutes': self.available_minutes,
            'used_minutes': self.used_minutes,
            'remaining_minutes': max(0, self.available_minutes - self.used_minutes),
        }


class AutomationJobWork(db.Model):
    __tablename__ = 'automation_job_works'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    activity_type_id = db.Column(db.Integer, db.ForeignKey('activity_types.id'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    deadline = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(30), default='Pending')  # Pending, Assigned, Completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    client = db.relationship('Client', backref=db.backref('sm_job_works', lazy=True, passive_deletes=True))
    activity_type = db.relationship('ActivityType', backref=db.backref('sm_job_works', lazy=True))
    creator = db.relationship('User', foreign_keys=[created_by])
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    assigned_employee = db.relationship('User', foreign_keys=[assigned_to])
    assignment_time = db.Column(db.DateTime, nullable=True) # Time when task becomes visible/assigned

    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'client_name': self.client.name if self.client else None,
            'activity_type_id': self.activity_type_id,
            'activity_type_name': self.activity_type.name if self.activity_type else None,
            'description': self.description,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'assigned_to': self.assigned_to,
            'assigned_employee_name': self.assigned_employee.name if self.assigned_employee else None,
            'assignment_time': self.assignment_time.isoformat() if self.assignment_time else None,
        }


class Attendance(db.Model):
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='Present')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('attendance_records', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'date', name='uq_user_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.isoformat(),
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }


# Association table for tasks and activities
task_activities = db.Table('task_activities',
    db.Column('task_id', db.Integer, db.ForeignKey('automation_tasks.id', ondelete='CASCADE'), primary_key=True),
    db.Column('activity_type_id', db.Integer, db.ForeignKey('activity_types.id', ondelete='CASCADE'), primary_key=True)
)

class AutomationTask(db.Model):
    __tablename__ = 'automation_tasks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activity_code = db.Column(db.String(40), unique=True, nullable=False)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    # Primary activity type for backward compatibility
    activity_type_id = db.Column(db.Integer, db.ForeignKey('activity_types.id'), nullable=False)

    # Assignment
    assigned_employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    assigned_date = db.Column(db.Date, default=date.today)

    # Workflow
    # Stages: content_writing → brand_manager_review → video_editing → brand_manager_video_review → completed
    current_stage = db.Column(db.String(50), default='content_writing')
    # Status: Pending, Assigned, In Progress, Submitted to BM, Rework Required (Writer), Assigned to Editor, Video Submitted, Rework Required (Editor), Completed
    status = db.Column(db.String(50), default='Pending')

    # Priority: 1=job_work, 2=rework, 3=monthly_deliverable
    priority = db.Column(db.Integer, default=3)
    source = db.Column(db.String(20), default='monthly')  # 'monthly' or 'job_work'
    job_work_id = db.Column(db.Integer, db.ForeignKey('automation_job_works.id'), nullable=True)

    # Monthly tracking
    month = db.Column(db.Integer, nullable=True)
    year = db.Column(db.Integer, nullable=True)

    minutes_at_creation = db.Column(db.Integer, default=0) # Snapshotted minutes (for records)
    deadline = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    rework_reason = db.Column(db.Text, nullable=True)
    rework_count = db.Column(db.Integer, default=0)

    # Content Submission Fields (Extended)
    caption_text = db.Column(db.Text, nullable=True)
    submission_caption = db.Column(db.Text, nullable=True)
    submission_title = db.Column(db.String(255), nullable=True)
    submission_description = db.Column(db.Text, nullable=True)
    submission_thumbnail = db.Column(db.Text, nullable=True)
    submission_reference = db.Column(db.Text, nullable=True)
    submission_file_path = db.Column(db.String(255), nullable=True)
    submission_thumbnail_path = db.Column(db.String(255), nullable=True)
    rough_cut_video_path = db.Column(db.String(255), nullable=True)

    # Video Editor Fields
    video_editor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    final_video_path = db.Column(db.String(255), nullable=True)
    final_thumbnail_path = db.Column(db.String(255), nullable=True)
    editor_notes = db.Column(db.Text, nullable=True)

    started_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    work_date = db.Column(db.Date, nullable=True) # Date when efficiency should be credited
    assignment_time = db.Column(db.DateTime, nullable=True) # Time when task becomes visible/assigned

    # Relationships
    client = db.relationship('Client', backref=db.backref('sm_tasks', lazy=True, passive_deletes=True))
    activity_type = db.relationship('ActivityType', foreign_keys=[activity_type_id], backref=db.backref('primary_tasks', lazy=True))
    activities = db.relationship('ActivityType', secondary=task_activities, backref=db.backref('tasks', lazy=True))
    assigned_employee = db.relationship('User', foreign_keys=[assigned_employee_id], backref=db.backref('sm_tasks', lazy=True))
    video_editor = db.relationship('User', foreign_keys=[video_editor_id], backref=db.backref('assigned_video_tasks', lazy=True))
    approvals = db.relationship('TaskApproval', backref='task', lazy=True, cascade='all, delete-orphan')

    @property
    def calculate_total_time(self):
        """Real-time calculation based on Activity Master and current stage"""
        is_video = self.current_stage in ['video_editing', 'brand_manager_video_review']
        
        # Sum relevant minutes from all associated activities
        total = 0
        for act in self.activities:
            total += act.editor_minutes if is_video else act.activity_time
            
        # Fallback to primary activity_type
        if total == 0 and self.activity_type:
            total = self.activity_type.editor_minutes if is_video else self.activity_type.activity_time
            
        return total

    def to_dict(self):
        return {
            'id': self.id,
            'activity_code': self.activity_code,
            'client_id': self.client_id,
            'client_name': self.client.name if self.client else None,
            'activity_type_id': self.activity_type_id,
            'activity_type_name': self.activity_type.name if self.activity_type else None,
            'activities': [act.to_dict() for act in self.activities],
            'total_minutes': self.calculate_total_time,
            'assigned_employee_id': self.assigned_employee_id,
            'assigned_employee_name': self.assigned_employee.name if self.assigned_employee else None,
            'video_editor_id': self.video_editor_id,
            'video_editor_name': self.video_editor.name if self.video_editor else None,
            'assigned_date': self.assigned_date.isoformat() if self.assigned_date else None,
            'current_stage': self.current_stage,
            'status': self.status,
            'priority': self.priority,
            'source': self.source,
            'month': self.month,
            'year': self.year,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'notes': self.notes,
            'rework_reason': self.rework_reason,
            'rework_count': self.rework_count or 0,
            'submission_title': self.submission_title,
            'submission_description': self.submission_description,
            'submission_caption': self.submission_caption,
            'submission_thumbnail': self.submission_thumbnail,
            'submission_reference': self.submission_reference,
            'submission_file_path': self.submission_file_path,
            'submission_thumbnail_path': self.submission_thumbnail_path,
            'rough_cut_video_path': self.rough_cut_video_path,
            'final_video_path': self.final_video_path,
            'final_thumbnail_path': self.final_thumbnail_path,
            'editor_notes': self.editor_notes,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'work_date': self.work_date.isoformat() if self.work_date else None,
            'assignment_time': self.assignment_time.isoformat() if self.assignment_time else None,
            # User Dashboard Required Aliases
            'title': self.submission_title or (self.activity_type.name if self.activity_type else 'Untitled Task'),
            'assigned_to': self.video_editor_id if self.current_stage in ['video_editing', 'brand_manager_video_review'] else self.assigned_employee_id,
            'assigned_role': 'Video Editor' if self.current_stage in ['video_editing', 'brand_manager_video_review'] else 'Content Writer',
        }


class TaskApproval(db.Model):
    __tablename__ = 'task_approvals'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    task_id = db.Column(db.Integer, db.ForeignKey('automation_tasks.id'), nullable=False)
    stage = db.Column(db.String(50), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(20), default='Pending')  # Pending, Approved, Rejected
    comments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    approver = db.relationship('User', foreign_keys=[approved_by])

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'stage': self.stage,
            'approved_by': self.approved_by,
            'approver_name': self.approver.name if self.approver else None,
            'status': self.status,
            'comments': self.comments,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    task_id = db.Column(db.Integer, db.ForeignKey('automation_tasks.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='activity_logs')
    task = db.relationship('AutomationTask', backref='activity_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'System',
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at.isoformat(),
        }


class AutomationRoughCut(db.Model):
    __tablename__ = 'automation_rough_cuts'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    media_paths = db.Column(db.Text, nullable=False) # Comma separated paths
    status = db.Column(db.String(30), default='Pending') # Pending, Assigned, Completed
    editor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    edited_video_path = db.Column(db.String(255), nullable=True)
    target_task_id = db.Column(db.Integer, db.ForeignKey('automation_tasks.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True) 
    work_date = db.Column(db.Date, nullable=True) 
    minutes = db.Column(db.Integer, default=30) 

    admin = db.relationship('User', foreign_keys=[admin_id])
    editor = db.relationship('User', foreign_keys=[editor_id])
    target_task = db.relationship('AutomationTask', backref=db.backref('rough_cut_origin', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'admin_name': self.admin.name if self.admin else None,
            'media_paths': self.media_paths.split(',') if self.media_paths else [],
            'status': self.status,
            'editor_id': self.editor_id,
            'editor_name': self.editor.name if self.editor else None,
            'edited_video_path': self.edited_video_path,
            'target_task_id': self.target_task_id,
            'target_task_code': self.target_task.activity_code if self.target_task else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'work_date': self.work_date.isoformat() if self.work_date else None,
            'minutes': self.minutes,
            # Consistency with AutomationTask
            'client_name': 'Internal (Rough Cut)',
            'activity_type_name': 'Video Rough Cut',
            'activity_code': f'RC-{self.id}',
            'submission_title': f'Rough Cut for {self.target_task.activity_code}' if self.target_task else 'General Rough Cut',
            'total_minutes': self.minutes,
            'source': 'rough_cut'
        }
