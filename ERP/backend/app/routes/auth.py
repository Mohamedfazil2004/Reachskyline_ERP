from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User
from app.extensions import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(
        name=data.get('name'),
        email=data.get('email'),
        role=data.get('role', 'Content Writer')
    )
    user.set_password(data.get('password'))
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        print(f"DEBUG: Login attempt for {email}")
        user = User.query.filter_by(email=email).first()
        
        if user:
            print(f"DEBUG: User found: {user.email}")
            is_valid = user.check_password(password)
            print(f"DEBUG: Password valid: {is_valid}")
            
            if is_valid:
                if not user.is_active:
                    return jsonify({'error': 'Account is disabled'}), 401
                    
                access_token = create_access_token(identity=str(user.id))
                return jsonify({
                    'token': access_token,
                    'user': user.to_dict()
                }), 200
        else:
            print(f"DEBUG: User {email} NOT found")
            
        return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        print(f"DEBUG: Login Error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200
