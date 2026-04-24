from app import create_app
from app.models.user import User
from app.extensions import db

app = create_app()
with app.app_context():
    print("=== Seeding Brand Manager and Editor ===")
    
    # 1. Brand Manager
    bm = User.query.filter_by(email='brandmanager@skyline.com').first()
    if not bm:
        bm = User(
            name='Brand Manager',
            email='brandmanager@skyline.com',
            role='Brand Manager',
            employee_id='E100'
        )
        bm.set_password('bm123')
        db.session.add(bm)
        print("Created Brand Manager: brandmanager@skyline.com / bm123")
    
    # 2. Editor
    editor = User.query.filter_by(email='editor@skyline.com').first()
    if not editor:
        editor = User(
            name='Video Editor',
            email='editor@skyline.com',
            role='Editor',
            employee_id='E200',
            is_video_editor=True
        )
        editor.set_password('editor123')
        db.session.add(editor)
        print("Created Editor: editor@skyline.com / editor123")
        
    db.session.commit()
    print("DONE")
