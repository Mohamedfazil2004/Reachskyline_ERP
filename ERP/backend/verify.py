from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print('=== SYSTEM VERIFICATION ===')

    ats = db.session.execute(text('SELECT code_id, name, code_letter, writer_minutes, editor_minutes FROM activity_types ORDER BY code_id')).fetchall()
    print(f'Activity Types ({len(ats)}):')
    for r in ats:
        print(f'  {r[0]}: {r[1]} [{r[2]}] writer={r[3]}m editor={r[4]}m')

    c_count  = db.session.execute(text('SELECT COUNT(*) FROM clients')).scalar()
    u_count  = db.session.execute(text('SELECT COUNT(*) FROM users')).scalar()
    md_count = db.session.execute(text('SELECT COUNT(*) FROM monthly_deliverables')).scalar()
    print(f'\nClients: {c_count}  Users: {u_count}  Monthly Deliverables: {md_count}')

    tables = ['automation_tasks', 'automation_job_works', 'employee_daily_minutes', 'task_approvals']
    for t in tables:
        count = db.session.execute(text(f'SELECT COUNT(*) FROM {t}')).scalar()
        print(f'  {t}: {count} rows')

    writers = db.session.execute(text(
        "SELECT name, employee_id, role FROM users WHERE role='Content Writer'"
    )).fetchall()
    print(f'\nContent Writers:')
    for w in writers:
        print(f'  {w[1]}: {w[0]}')

    routes = [r.rule for r in app.url_map.iter_rules() if 'automation' in r.rule]
    print(f'\nAutomation routes registered: {len(routes)}')
    for r in sorted(routes):
        print(f'  {r}')
