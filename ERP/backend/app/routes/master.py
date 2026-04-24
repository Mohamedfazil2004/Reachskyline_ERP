from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.master import Client, ActivityType
from app.extensions import db

master_bp = Blueprint('master', __name__)

# CLIENTS
@master_bp.route('/clients', methods=['GET'])
@jwt_required()
def get_clients():
    clients = Client.query.all()
    return jsonify([c.to_dict() for c in clients]), 200

@master_bp.route('/clients', methods=['POST'])
@jwt_required()
def add_client():
    from app.models.user import User
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
             return jsonify({'error': 'User not found'}), 404
             
        if user.role not in ['Admin', 'Manager', 'Brand Manager']:
            return jsonify({'error': f'Unauthorized: Role {user.role} cannot add clients'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Missing request body'}), 400
            
        client_id = data.get('id')
        if not client_id:
            return jsonify({'error': 'Client ID is required'}), 400
            
        if Client.query.get(client_id):
            return jsonify({'error': f'Client ID {client_id} already exists'}), 409
            
        client = Client(
            id=client_id,
            name=data.get('name'),
            industry=data.get('industry'),
            contact_person=data.get('contact_person'),
            contact_email=data.get('contact_email'),
            contact_phone=data.get('contact_phone'),
            created_by=user.id
        )
        db.session.add(client)
        db.session.commit()
        return jsonify(client.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@master_bp.route('/clients/<string:client_id>', methods=['DELETE'])
@jwt_required()
def delete_client(client_id):
    from app.models.user import User
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['Admin', 'Manager', 'Brand Manager']:
            return jsonify({'error': 'Unauthorized'}), 403
            
        client = Client.query.get(client_id)
        if not client:
            return jsonify({'error': 'Client not found'}), 404
            
        db.session.delete(client)
        db.session.commit()
        return jsonify({'message': 'Client deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ACTIVITY TYPES
@master_bp.route('/activity-types', methods=['GET'])
@jwt_required()
def get_activity_types():
    types = ActivityType.query.all()
    return jsonify([t.to_dict() for t in types]), 200

@master_bp.route('/activity-types', methods=['POST'])
@jwt_required()
def add_activity_type():
    from app.models.user import User
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Admin':
            return jsonify({'error': 'Unauthorized: Only Admin can add activity types'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Missing request body'}), 400
            
        a_type = ActivityType(
            name=data.get('name'),
            code=data.get('code'),
            description=data.get('description')
        )
        db.session.add(a_type)
        db.session.commit()
        return jsonify(a_type.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@master_bp.route('/activity-types/<int:at_id>', methods=['PATCH'])
@jwt_required()
def update_activity_type(at_id):
    from app.models.user import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != 'Admin':
        return jsonify({'error': 'Unauthorized: Only Admin can edit activity minutes'}), 403
    at = ActivityType.query.get_or_404(at_id)
    data = request.json or {}
    if 'name' in data:
        at.name = data['name']
    if 'writer_minutes' in data:
        at.writer_minutes = int(data['writer_minutes'])
    if 'editor_minutes' in data:
        at.editor_minutes = int(data['editor_minutes'])
    if 'code_letter' in data:
        at.code_letter = data['code_letter']
    db.session.commit()
    return jsonify(at.to_dict()), 200
