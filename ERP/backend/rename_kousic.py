from app import create_app, db
from app.models.user import User

app = create_app()
with app.app_context():
    u = User.query.filter_by(email='kowshik@reachskyline.com').first()
    if u:
        print(f'Found: {u.name} — renaming to Kousic')
        u.name = 'Kousic'
        db.session.commit()
        print('Done!')
    else:
        print('User not found by email — searching by name...')
        u2 = User.query.filter(User.name.ilike('%kowshik%')).first()
        if u2:
            print(f'Found: {u2.name} — renaming to Kousic')
            u2.name = 'Kousic'
            db.session.commit()
            print('Done!')
        else:
            print('ERROR: User not found')
