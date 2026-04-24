from app import create_app
from app.models.automation import MonthlyDeliverable
from app.models.user import User
from app.models.master import ActivityType
from app.extensions import db
import calendar
from datetime import date

app = create_app()

def analyze_march():
    with app.app_context():
        print("=== March 2026 Social Media Automation Analysis ===")
        
        # 1. Total Deliverables
        deliverables = MonthlyDeliverable.query.filter_by(month=3, year=2026).all()
        total_tasks = 0
        total_writer_minutes = 0
        
        print(f"\nMonthly Deliverables (March 2026):")
        print(f"{'Client':<30} | {'Activity':<25} | {'Target':<6} | {'Mins/Task':<10} | {'Total Mins':<10}")
        print("-" * 90)
        
        for d in deliverables:
            at = ActivityType.query.get(d.activity_type_id)
            if not at: continue
            
            task_mins = at.writer_minutes
            row_total_mins = d.monthly_target * task_mins
            
            total_tasks += d.monthly_target
            total_writer_minutes += row_total_mins
            
            print(f"{d.client.name[:30]:<30} | {at.name[:25]:<25} | {d.monthly_target:<6} | {task_mins:<10} | {row_total_mins:<10}")
            
        print("-" * 90)
        print(f"{'TOTAL':<58} | {total_tasks:<6} | {'':<10} | {total_writer_minutes:<10}")
        
        # 2. Total Capacity
        writers = User.query.filter(User.role.in_(['Content Writer']), User.is_active == True).all()
        total_daily_mins = 0
        print(f"\nActive Content Writers Capacity:")
        for w in writers:
            # Check if they have a specific daily limit override, otherwise use defaults
            # For this analysis we use the common ones: Sri=480, Abirami=240
            # E006 Sri (480), E007 Abirami (240)
            mins = 480 if w.employee_id == 'E006' else 240
            total_daily_mins += mins
            print(f"- {w.name} ({w.employee_id}): {mins} mins/day")
            
        # 3. Time to Finish
        days_in_march = calendar.monthrange(2026, 3)[1]
        print(f"\nSummary:")
        print(f"- Total Tasks to Generate: {total_tasks}")
        print(f"- Total Writer Minutes Required: {total_writer_minutes} mins")
        print(f"- Team Daily Capacity: {total_daily_mins} mins/day")
        
        if total_daily_mins > 0:
            days_needed = total_writer_minutes / total_daily_mins
            print(f"- Estimated Days to Finish All: {days_needed:.2f} days")
            print(f"- Available Workdays in March: {days_in_march} days")
            
            if days_needed <= days_in_march:
                print(f"\n✅ Result: The team HAS ENOUGH capacity to finish all March tasks.")
                print(f"Optimal distribution: ~{total_writer_minutes/days_in_march:.1f} minutes per day.")
            else:
                print(f"\n❌ Result: The team is OVER CAPACITY. You need ~{days_needed - days_in_march:.2f} more days or more writers.")

if __name__ == '__main__':
    analyze_march()
