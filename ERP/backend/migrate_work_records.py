import sys
import os
import requests
import csv
from datetime import datetime
from io import StringIO

# Add current directory to path
sys.path.append(os.getcwd())

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.master import Client
from app.models.work_record import WorkRecord

app = create_app()

def migrate_records():
    with app.app_context():
        # User Mapping
        user_config = {
            "Sasi": {
                "email": "sasi@skyline.com",
                "gid": "1091149386",
                "role": "Business Development Head"
            },
            "Swetha": {
                "email": "swetha@skyline.com",
                "gid": "1812360918",
                "role": "HR"
            },
            "Mathesh": {
                "email": "mathesh@reachskyline.com",
                "gid": "720800670",
                "role": "Website Head"
            },
            "Mounish": {
                "email": "mounish@skyline.com",
                "gid": "362696882",
                "role": "Content Head"
            },
            "Brand Manager": {
                "email": "brandmanager@skyline.com",
                "gid": "293937368",
                "role": "Brand Manager"
            }
        }

        # Client name to ID mapping
        clients_db = {c.name.lower(): c.id for c in Client.query.all()}
        
        def get_client_id(name):
            if not name: return None
            name_clean = name.strip().lower()
            if name_clean in clients_db:
                return clients_db[name_clean]
            # Try fuzzy or partial matches
            for k, v in clients_db.items():
                if k in name_clean or name_clean in k:
                    return v
            return None

        def parse_date(date_str):
            if not date_str: return datetime.utcnow().date()
            clean_date = date_str.strip().replace('"', '')
            # Handle formats like "18 February, 2026" or "18 Feb, 2026" or "18/02/2026"
            formats = ["%d %B, %Y", "%d %b, %Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]
            for fmt in formats:
                try:
                    return datetime.strptime(clean_date, fmt).date()
                except:
                    continue
            
            # Alternative parsing for "18 February, 2026"
            try:
                parts = clean_date.replace(',', '').split(' ')
                if len(parts) >= 3:
                    d = parts[0].zfill(2)
                    m = parts[1][:3] # Short month
                    y = parts[2]
                    return datetime.strptime(f"{d} {m} {y}", "%d %b %Y").date()
            except:
                pass
                
            print(f"Failed to parse date: {date_str}")
            return datetime.utcnow().date()

        base_url = "https://docs.google.com/spreadsheets/d/130sKngZZYFqMomCHcZP99IFDMyO0GaxKY9n8GtlFlHA/export?format=csv&gid="

        for name, config in user_config.items():
            user = User.query.filter_by(email=config["email"]).first()
            if not user:
                print(f"User {name} ({config['email']}) not found. Creating user...")
                user = User(
                    name=name,
                    email=config["email"],
                    role=config["role"],
                    is_active=True
                )
                user.set_password(f"{name.lower().replace(' ', '_')}_password")
                db.session.add(user)
                db.session.commit()
                print(f"Created user {name} with role {config['role']}")

            print(f"Migrating records for {name} (ID: {user.id}, Email: {user.email})...")
            url = base_url + config["gid"]
            try:
                response = requests.get(url)
                if response.status_code != 200:
                    print(f"Failed to fetch data for {name} from GID {config['gid']}")
                    continue
            except Exception as e:
                print(f"Error fetching {url}: {e}")
                continue

            content = response.text
            csv_data = csv.DictReader(StringIO(content))
            rows_added = 0
            
            # Identify columns dynamically (case insensitive-ish)
            fieldnames = csv_data.fieldnames
            date_col = next((f for f in fieldnames if 'date' in f.lower()), 'Date')
            client_col = next((f for f in fieldnames if 'client' in f.lower()), 'Client')
            desc_col = next((f for f in fieldnames if 'work' in f.lower() or 'description' in f.lower()), 'Work Description')
            time_col = next((f for f in fieldnames if 'time' in f.lower() or 'min' in f.lower()), 'Time')
            status_col = next((f for f in fieldnames if 'status' in f.lower()), 'Status')
            remark_col = next((f for f in fieldnames if 'remark' in f.lower()), 'Remark')

            for row in csv_data:
                d_str = row.get(date_col)
                c_name = row.get(client_col)
                desc = row.get(desc_col)
                time_val = row.get(time_col)
                status = row.get(status_col, 'Completed') or 'Completed'
                remark = row.get(remark_col, '')

                if not d_str or (not desc and not remark):
                    continue
                
                full_desc = desc if desc else ""
                if remark:
                    full_desc += f" (Remark: {remark})"
                
                record_date = parse_date(d_str)
                client_id = get_client_id(c_name)
                
                minutes = 0
                try:
                    if time_val:
                        time_clean = ''.join(c for c in str(time_val) if c.isdigit() or c == '.')
                        if time_clean:
                            minutes = int(float(time_clean))
                except:
                    pass

                # Avoid Duplicates
                existing = WorkRecord.query.filter_by(
                    user_id=user.id,
                    date=record_date,
                    work_description=full_desc
                ).first()

                if not existing:
                    new_record = WorkRecord(
                        user_id=user.id,
                        client_id=client_id,
                        date=record_date,
                        work_description=full_desc,
                        time_minutes=minutes,
                        status=status
                    )
                    db.session.add(new_record)
                    rows_added += 1

            db.session.commit()
            print(f"Successfully migrated {rows_added} records for {name}.")

if __name__ == "__main__":
    migrate_records()
