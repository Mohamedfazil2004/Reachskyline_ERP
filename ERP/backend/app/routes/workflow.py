from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.workflow import MonthlyPlan, Deliverable, JobWork, Shoot
from app.models.master import Client, ActivityType
from app.extensions import db
from datetime import datetime

workflow_bp = Blueprint('workflow', __name__)

# MONTHLY PLANNING & ACTIVITY CODE GENERATION
@workflow_bp.route('/planning', methods=['POST'])
@jwt_required()
def create_plan():
    from app.models.user import User
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role not in ['Admin', 'Manager']:
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json() # {client_id, month, year, deliverables: [{type_id, count, ...}]}
        
        plan = MonthlyPlan(
            client_id=data.get('client_id'),
            month=data.get('month'),
            year=data.get('year'),
            created_by=user.id
        )
        db.session.add(plan)
        db.session.flush() # Get plan.id
        
        # Generate Activity Codes & Deliverables (Step 5)
        deliverables_info = data.get('deliverables', [])
        for item in deliverables_info:
            count = item.get('count', 1)
            a_type = ActivityType.query.get(item.get('type_id'))
            if not a_type: continue
            
            for i in range(1, count + 1):
                # ACTIVITY CODE: Year-Month-ClientID-TypeCode-Seq
                activity_code = f"{plan.year}-{plan.month}-{plan.client_id}-{a_type.code}-{i:02d}"
                
                deliverable = Deliverable(
                    activity_code=activity_code,
                    plan_id=plan.id,
                    client_id=plan.client_id,
                    activity_type_id=a_type.id,
                    status='Pending'
                )
                db.session.add(deliverable)
                
        db.session.commit()
        return jsonify(plan.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# CONTENT CALENDAR / DELIVERABLES
@workflow_bp.route('/calendar', methods=['GET'])
@jwt_required()
def get_calendar():
    # Filter by month/year if provided
    month = request.args.get('month', type=int)
    year = request.args.get('year', type=int)
    client_id = request.args.get('client_id')
    
    query = Deliverable.query
    if month:
        query = query.join(MonthlyPlan).filter(MonthlyPlan.month == month)
    if year:
        query = query.join(MonthlyPlan).filter(MonthlyPlan.year == year)
    if client_id:
        query = query.filter(Deliverable.client_id == client_id)
        
    deliverables = query.all()
    return jsonify([d.to_dict() for d in deliverables]), 200

@workflow_bp.route('/deliverable/<int:id>', methods=['PATCH'])
@jwt_required()
def update_deliverable(id):
    from app.models.user import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    deliverable = Deliverable.query.get_or_404(id)
    data = request.get_json()
    
    # Permission checks based on role and field
    # (Simplified for now, can be expanded to strictly follow roles)
    
    fields = [
        'planned_date', 'rough_cut_link', 'content_draft', 'thumbnail_concept',
        'description', 'title', 'reference_link', 'final_output_link', 
        'status', 'time_spent_minutes', 'assigned_writer_id', 'assigned_editor_id'
    ]
    
    for field in fields:
        if field in data:
            if field == 'planned_date' and data[field]:
                setattr(deliverable, field, datetime.strptime(data[field], '%Y-%m-%d').date())
            else:
                setattr(deliverable, field, data[field])
                
    if data.get('qc_approved'):
        if user.role in ['Admin', 'Manager', 'QC Team']:
            deliverable.status = 'QC Approved'
            deliverable.qc_approved_by = user.id
            deliverable.qc_approved_at = datetime.utcnow()
            
    db.session.commit()
    return jsonify(deliverable.to_dict()), 200

# JOB WORK
@workflow_bp.route('/job-work', methods=['POST'])
@jwt_required()
def add_job_work():
    data = request.get_json()
    # Generate activity code for Job Work
    now = datetime.utcnow()
    count = JobWork.query.filter(JobWork.client_id == data.get('client_id')).count() + 1
    activity_code = f"{now.year}-{now.month}-{data.get('client_id')}-JW-{count:02d}"
    
    jw = JobWork(
        activity_code=activity_code,
        client_id=data.get('client_id'),
        description=data.get('description'),
        deadline=datetime.strptime(data.get('deadline'), '%Y-%m-%dT%H:%M') if data.get('deadline') else None,
        status='In Progress'
    )
    db.session.add(jw)
    db.session.commit()
    return jsonify(jw.to_dict()), 201

@workflow_bp.route('/job-work', methods=['GET'])
@jwt_required()
def get_job_works():
    client_id = request.args.get('client_id')
    query = JobWork.query
    if client_id:
        query = query.filter(JobWork.client_id == client_id)
    return jsonify([j.to_dict() for j in query.all()]), 200

# SHOOTS
@workflow_bp.route('/shoots', methods=['POST'])
@jwt_required()
def add_shoot():
    data = request.get_json()
    shoot = Shoot(
        video_title=data.get('video_title'),
        client_id=data.get('client_id'),
        content_type=data.get('content_type'),
        footage_link=data.get('footage_link'),
        reference_link=data.get('reference_link'),
        shoot_date=datetime.strptime(data.get('shoot_date'), '%Y-%m-%d') if data.get('shoot_date') else datetime.utcnow()
    )
    db.session.add(shoot)
    db.session.commit()
    return jsonify(shoot.to_dict()), 201
