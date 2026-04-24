import csv
import io
import requests
from app import create_app
from app.extensions import db
from app.models.master import Client, ActivityType
from app.models.automation import MonthlyDeliverable
from datetime import date

def sync_deliverables():
    app = create_app()
    with app.app_context():
        # Sheet CSV export URL
        url = "https://docs.google.com/spreadsheets/d/18uATfOdZHKzlUrLs3RttVvNF8NVF95pYnwdrrlW5GWY/export?format=csv&gid=0"
        response = requests.get(url)
        content = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)

        # Better Mapping
        name_map = {
            "Supreme Hospital": "Supreme Speciality Hospital",
            "Gem": "GM Hospital",
            "Dr Senthilanthan": "Dr Senthilnathan",
            "MCH": "Madras Coffee House",
            "Ramnath Bhagavath": "Ramnath Bhagavath",
            "Brigantine": "Brigantine",
            "Spahi": "Spahi",
            "Reach Skyline": "Reach Skyline",
            "MSPVL": "MSPVL Polytechnic College",
            "SCSVMV University": "SCSVMV University"
        }

        # Find the data rows starting after header row in summary table
        data_rows = []
        found_header = False
        for row in rows:
            if not row: continue
            if len(row) > 3 and "Client Name" in row[3] and "YTS" in row[4]:
                found_header = True
                continue
            
            if found_header:
                if len(row) < 4 or not row[3].strip():
                    break
                row_client = row[3].strip()
                if row_client in name_map:
                    data_rows.append(row)

        target_month = 3
        target_year = 2026

        deleted = MonthlyDeliverable.query.filter_by(month=target_month, year=target_year).delete()
        print(f"Deleted {deleted} existing deliverables.")

        synced_count = 0
        total_qty = 0
        for dr in data_rows:
            client_name_sheet = dr[3].strip()
            db_client_name = name_map[client_name_sheet]
            
            client = Client.query.filter(Client.name.ilike(f"%{db_client_name}%")).first()
            if not client:
                print(f"DB Client not found for: {db_client_name}")
                continue
            
            # Map columns to activities
            mappings = [
                ("Shorts", dr[4]),
                ("Post", dr[5]),
                ("Animated Reel", dr[6]),
                ("Long Form Brochure", dr[7])
            ]

            for act_name, qty_str in mappings:
                try:
                    qty = int(qty_str.strip()) if qty_str and qty_str.strip() else 0
                except ValueError:
                    qty = 0
                
                if qty > 0:
                    at = ActivityType.query.filter_by(name=act_name).first()
                    if at:
                        md = MonthlyDeliverable(
                            client_id=client.id,
                            activity_type_id=at.id,
                            month=target_month,
                            year=target_year,
                            monthly_target=qty
                        )
                        db.session.add(md)
                        synced_count += 1
                        total_qty += qty
                    else:
                        print(f"Activity Type {act_name} not found in DB")

        db.session.commit()
        print(f"Finished sync. Synced {synced_count} deliverables records representing {total_qty} total tasks.")

if __name__ == "__main__":
    sync_deliverables()
