import os
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import db, jwt, migrate

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins="*")

    @app.route('/')
    def home():
        return {"message": "Reach Skyline ERP Backend is Running!"}, 200

    # Auto-create admin user if not exists
    with app.app_context():
        try:
            from app.models.user import User
            admin = User.query.filter_by(email='admin@erp.com').first()
            if not admin:
                print("SEED: Creating default admin user...")
                new_admin = User(
                    name="System Admin",
                    email="admin@erp.com",
                    role="Admin",
                    is_active=True
                )
                new_admin.set_password("admin123")
                db.session.add(new_admin)
                db.session.commit()
                print("SEED: Admin user created successfully!")
            else:
                print("SEED: Admin user already exists.")
        except Exception as e:
            print(f"SEED ERROR: {e}")

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.master import master_bp
    from app.routes.workflow import workflow_bp
    from app.routes.automation import automation_bp
    from app.routes.work_record import work_record_bp
    from app.routes.website import website_bp
    from app.routes.chat import chat_bp
    from app.routes.meeting import meeting_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(master_bp, url_prefix='/api/master')
    app.register_blueprint(workflow_bp, url_prefix='/api/workflow')
    app.register_blueprint(automation_bp, url_prefix='/api/automation')
    app.register_blueprint(work_record_bp, url_prefix='/api/work-records')
    app.register_blueprint(website_bp, url_prefix='/api/website')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(meeting_bp, url_prefix='/api/meetings')

    @app.route('/health')
    def health():
        return {'status': 'healthy', 'message': 'ERP Backend is running'}

    from flask import send_from_directory
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(os.path.join(app.root_path, '..', 'uploads'), filename)

    return app
