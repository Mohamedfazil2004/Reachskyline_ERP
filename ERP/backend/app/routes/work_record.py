from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.work_record import WorkRecord
from app.models.user import User
from app.models.master import Client

work_record_bp = Blueprint('work_record', __name__)

@work_record_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_records():
    user_id = get_jwt_identity()
    records = WorkRecord.query.filter_by(user_id=user_id).order_by(WorkRecord.date.desc(), WorkRecord.created_at.desc()).all()
    return jsonify([r.to_dict() for r in records]), 200

@work_record_bp.route('/add', methods=['POST'])
@jwt_required()
def add_record():
    user_id = get_jwt_identity()
    data = request.json
    
    date_str = data.get('date')
    client_id = data.get('client_id')
    work_description = data.get('work_description')
    time_minutes = data.get('time_minutes', 0)
    status = data.get('status', 'Completed')

    if not work_description:
        return jsonify({'error': 'Work description is required'}), 400

    try:
        record_date = datetime.fromisoformat(date_str).date() if date_str else datetime.utcnow().date()
    except:
        record_date = datetime.utcnow().date()

    new_record = WorkRecord(
        user_id=user_id,
        client_id=client_id if client_id and client_id != "" else None,
        date=record_date,
        work_description=work_description,
        time_minutes=int(time_minutes) if time_minutes else 0,
        status=status
    )

    db.session.add(new_record)
    db.session.commit()

    return jsonify(new_record.to_dict()), 201

@work_record_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_records():
    # Only Admin or Manager should access this usually, but checking role
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.role not in ['Admin', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    # Optional filters
    client_id = request.args.get('client_id')
    user_id_filter = request.args.get('user_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = WorkRecord.query

    if client_id:
        query = query.filter_by(client_id=client_id)
    if user_id_filter:
        query = query.filter_by(user_id=user_id_filter)
    if start_date:
        query = query.filter(WorkRecord.date >= start_date)
    if end_date:
        query = query.filter(WorkRecord.date <= end_date)

    records = query.order_by(WorkRecord.date.desc(), WorkRecord.created_at.desc()).all()
    return jsonify([r.to_dict() for r in records]), 200

@work_record_bp.route('/efficiency', methods=['GET'])
@jwt_required()
def get_efficiency():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.role not in ['Admin', 'Brand Manager']:
        return jsonify({'error': 'Unauthorized'}), 403

    # Roles to track efficiency for
    staff_roles = ['Business Development Head', 'HR', 'Website & SEO Head', 'Website Head']
    users = User.query.filter(User.role.in_(staff_roles)).all()
    
    results = []
    for u in users:
        records = WorkRecord.query.filter_by(user_id=u.id).all()
        total = len(records)
        completed = len([r for r in records if r.status == 'Completed'])
        pending = total - completed
        
        eff = (completed / total * 100) if total > 0 else 0
        
        results.append({
            'user_id': u.id,
            'name': u.name,
            'role': u.role,
            'total_tasks': total,
            'completed_tasks': completed,
            'pending_tasks': pending,
            'efficiency': round(float(eff), 1)
        })

    return jsonify(results), 200

@work_record_bp.route('/delete/<int:record_id>', methods=['DELETE'])
@jwt_required()
def delete_record(record_id):
    user_id = get_jwt_identity()
    record = WorkRecord.query.get_or_404(record_id)
    
    # Check if owner or admin
    user = User.query.get(user_id)
    if record.user_id != int(user_id) and user.role != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(record)
    db.session.commit()
    return jsonify({'message': 'Record deleted successfully'}), 200
