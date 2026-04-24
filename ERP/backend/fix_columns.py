from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect

app = create_app()
with app.app_context():
    insp = inspect(db.engine)
    cols = [c['name'] for c in insp.get_columns('activity_types')]
    print('Current DB columns:', cols)

    if 'code_id' not in cols:
        db.session.execute(text('ALTER TABLE activity_types ADD COLUMN code_id VARCHAR(10)'))
        db.session.commit()
        print('Added code_id')

    if 'code_letter' not in cols:
        db.session.execute(text("ALTER TABLE activity_types ADD COLUMN code_letter VARCHAR(5) DEFAULT 'X'"))
        db.session.commit()
        print('Added code_letter')

    cols2 = [c['name'] for c in inspect(db.engine).get_columns('activity_types')]
    print('Updated columns:', cols2)

    # Now create all remaining tables
    db.create_all()
    print('All tables created/verified')
