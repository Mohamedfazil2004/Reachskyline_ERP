"""Clean up duplicate activity types and fix data"""
from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():

    # See all activity types
    rows = db.session.execute(text("SELECT id, code_id, name, code_letter FROM activity_types ORDER BY id")).fetchall()
    print("Current activity types:")
    for r in rows:
        print(f"  id={r[0]} code_id={r[1]} name={r[2]} letter={r[3]}")

    # Delete old records with NULL code_id
    result = db.session.execute(text("DELETE FROM activity_types WHERE code_id IS NULL"))
    db.session.commit()
    print(f"\nDeleted {result.rowcount} records with NULL code_id")

    # Re-seed clean activity types
    activity_types = [
        ("AT001","Post","P",5,15),
        ("AT002","Animated Reel / Card Design","R",10,25),
        ("AT003","Carousel","C",10,25),
        ("AT004","YouTube Shorts / Flyer","S",20,60),
        ("AT005","Long Form / YouTube Long","L",40,90),
        ("AT007","Blog & GMB","B",20,15),
        ("AT008","Ad Shorts","A",10,90),
    ]
    for code_id, name, code_letter, wm, em in activity_types:
        db.session.execute(text(
            "INSERT INTO activity_types (code_id, name, code_letter, writer_minutes, editor_minutes, duration_minutes) "
            "VALUES (:code_id, :name, :code_letter, :wm, :em, :wm) "
            "ON DUPLICATE KEY UPDATE name=:name, code_letter=:code_letter, writer_minutes=:wm, editor_minutes=:em"
        ), {"code_id": code_id, "name": name, "code_letter": code_letter, "wm": wm, "em": em})
    db.session.commit()

    # Now update monthly_deliverables to point to correct activity type IDs
    at_map = {}
    rows = db.session.execute(text("SELECT id, code_id FROM activity_types")).fetchall()
    for r in rows:
        at_map[r[1]] = r[0]
    print("\nActivity type ID map:", at_map)

    # Re-seed monthly deliverables with correct IDs
    deliverables = [
        ("C005","AT004",2,2026,8),("C005","AT001",2,2026,10),("C005","AT002",2,2026,10),("C005","AT005",2,2026,4),
        ("C003","AT004",2,2026,5),("C003","AT001",2,2026,5),("C003","AT002",2,2026,5),("C003","AT005",2,2026,5),
        ("C004","AT004",2,2026,5),("C004","AT005",2,2026,2),
        ("C009","AT004",2,2026,8),("C009","AT001",2,2026,5),("C009","AT002",2,2026,8),
        ("C001","AT004",2,2026,31),
        ("C011","AT004",2,2026,8),
        ("C013","AT001",2,2026,5),
        ("C006","AT001",2,2026,10),("C006","AT002",2,2026,10),
        ("C022","AT004",2,2026,10),("C022","AT001",2,2026,8),("C022","AT002",2,2026,6),("C022","AT005",2,2026,4),
        ("C031","AT004",2,2026,8),("C031","AT001",2,2026,10),("C031","AT002",2,2026,10),("C031","AT005",2,2026,2),
    ]

    # Delete existing deliverables for Feb 2026 and re-insert cleanly
    db.session.execute(text("DELETE FROM monthly_deliverables WHERE month=2 AND year=2026"))
    db.session.commit()

    count = 0
    for cid, at_code, month, year, target in deliverables:
        at_id = at_map.get(at_code)
        if not at_id:
            print(f"  ⚠ {at_code} not found!")
            continue
        db.session.execute(text(
            "INSERT INTO monthly_deliverables (client_id, activity_type_id, month, year, monthly_target, completed_count) "
            "VALUES (:cid, :atid, :m, :y, :t, 0)"
        ), {"cid": cid, "atid": at_id, "m": month, "y": year, "t": target})
        count += 1
    db.session.commit()

    # Final verification
    print("\n=== FINAL VERIFICATION ===")
    ats = db.session.execute(text("SELECT code_id, name, code_letter, writer_minutes, editor_minutes FROM activity_types ORDER BY code_id")).fetchall()
    print(f"Activity Types ({len(ats)}):")
    for r in ats:
        print(f"  {r[0]}: {r[1]} [{r[2]}] writer={r[3]}m editor={r[4]}m")

    md_count = db.session.execute(text("SELECT COUNT(*) FROM monthly_deliverables WHERE month=2 AND year=2026")).scalar()
    print(f"\nMonthly Deliverables Feb 2026: {md_count}")

    clients_count = db.session.execute(text("SELECT COUNT(*) FROM clients")).scalar()
    users_count = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar()
    print(f"Clients: {clients_count}")
    print(f"Users: {users_count}")
    print("\n✅ Cleanup complete!")
