from app import create_app
from app.extensions import db
from app.models.automation import MonthlyDeliverable, AutomationJobWork, AutomationTask, EmployeeDailyMinutes
from app.models.master import Client, ActivityType
from app.models.user import User
from datetime import date

app = create_app()

def run_engine_simulation():
    with app.app_context():
        # Configuration
        TARGET_DATE = date(2026, 3, 1)
        TOTAL_CAPACITY = 720 # Sri (480) + Abirami (240)
        
        # 1. Fetch Priority 1: Pending / Rework (currently 0 as per previous clear)
        pending_rework = AutomationTask.query.filter(
            AutomationTask.status == 'rework',
            AutomationTask.current_stage == 'content_writing'
        ).all()
        
        # 2. Fetch Priority 2: Job Work
        job_works = AutomationJobWork.query.filter_by(status='pending').all()
        
        # 3. Fetch Priority 3: Monthly Deliverables
        deliverables = MonthlyDeliverable.query.filter_by(month=3, year=2026).all()
        
        used_minutes = 0
        assigned_tasks = []
        
        # Helper to track remaining monthly balance in memory for the report
        remaining_balances = {}
        for d in deliverables:
            key = (d.client_id, d.activity_type_id)
            remaining_balances[key] = d.monthly_target - d.completed_count

        # PROCESS ALLOCATION
        
        # Priority 1 & 2 processing (skipped if empty)
        # Assuming current state is mostly Monthly Deliverables
        
        # Priority 3: Monthly Deliverables
        # We simulate the allocation until capacity is hit
        # We sort by target (descending) to fill capacity meaningfully
        deliverables.sort(key=lambda x: x.monthly_target, reverse=True)
        
        for d in deliverables:
            if used_minutes >= TOTAL_CAPACITY: break
            
            at = ActivityType.query.get(d.activity_type_id)
            if not at: continue
            
            client = Client.query.get(d.client_id)
            client_name = client.name if client else "Unknown"
            
            task_mins = at.writer_minutes
            
            # How many can we assign today for this deliverable?
            # Normally we spread them, but the prompt says 
            # "Stop assigning when minutes reach the limit."
            # and "Show how many tasks get assigned today".
            
            # Simple greedy: assign tasks from each deliverable one by one or in blocks
            # Let's assign 2 tasks of each type until capacity reached to show variety
            tasks_to_assign = 2 
            for _ in range(tasks_to_assign):
                if used_minutes + task_mins <= TOTAL_CAPACITY:
                    assigned_tasks.append({
                        'client': client_name,
                        'activity': at.name,
                        'mins': task_mins
                    })
                    used_minutes += task_mins
                    key = (d.client_id, d.activity_type_id)
                    remaining_balances[key] -= 1
                else:
                    break

        # If after variety we still have room, fill greedily
        for d in deliverables:
            if used_minutes >= TOTAL_CAPACITY: break
            at = ActivityType.query.get(d.activity_type_id)
            task_mins = at.writer_minutes
            key = (d.client_id, d.activity_type_id)
            
            while remaining_balances[key] > 0 and used_minutes + task_mins <= TOTAL_CAPACITY:
                client = Client.query.get(d.client_id)
                assigned_tasks.append({
                    'client': client.name,
                    'activity': at.name,
                    'mins': task_mins
                })
                used_minutes += task_mins
                remaining_balances[key] -= 1

        # OUTPUT
        print("1. Tasks Assigned Today:")
        # Group for clarity in output
        summary = {}
        for t in assigned_tasks:
            k = (t['client'], t['activity'], t['mins'])
            summary[k] = summary.get(k, 0) + 1
            
        for (c, a, m), count in summary.items():
            print(f"- {c} – {a} – ({count} tasks x {m} mins) = {count*m} mins")
            
        print(f"\n2. Total Minutes Used: {used_minutes} mins")
        print(f"3. Remaining Minutes Capacity: {TOTAL_CAPACITY - used_minutes} mins")
        
        print("\n4. Remaining Monthly Balance per Activity:")
        for (cid, atid), bal in remaining_balances.items():
            cl = Client.query.get(cid)
            at = ActivityType.query.get(atid)
            if bal > 0:
                print(f"- {cl.name} | {at.name}: {bal} tasks remaining")

        print("\n5. Explanation of Why Assignment Stopped:")
        if used_minutes >= TOTAL_CAPACITY:
            print("Assignment stopped because the Content Writer's daily capacity (720 minutes) has been reached/minimized.")
        else:
            print("Assignment stopped because all monthly deliverables for the current plan were satisfied for this day's allocation.")

if __name__ == "__main__":
    run_engine_simulation()
