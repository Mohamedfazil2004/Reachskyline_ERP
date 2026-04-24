import math

# Data from DB
tasks_list = [
    {"name": "Post", "count": 45, "mins": 5},
    {"name": "Animated Reel", "count": 45, "mins": 10},
    {"name": "YouTube Shorts", "count": 85, "mins": 20},
    {"name": "Long Form", "count": 27, "mins": 40},
]

total_mins_required = sum(t["count"] * t["mins"] for t in tasks_list)
daily_capacity = 720 # 480 (Emp A) + 240 (Emp B)

print(f"Total Minutes Required: {total_mins_required}")
print(f"Daily Capacity: {daily_capacity}")

# Simulate Daily Allocation
remaining_tasks = []
for t in tasks_list:
    for _ in range(t["count"]):
        remaining_tasks.append(t["mins"])

# Sort tasks descending to simulate a realistic difficult-first or balanced packing
remaining_tasks.sort(reverse=True)

days = 0
while remaining_tasks:
    days += 1
    current_day_mins = 0
    tasks_assigned_today = 0
    emp_a_mins = 0
    emp_b_mins = 0
    
    # We assign to employees specifically
    # Emp A: 480, Emp B: 240
    
    still_assigning = True
    while still_assigning and remaining_tasks:
        task_mins = remaining_tasks[0]
        assigned = False
        
        # Try Emp A first (greedy)
        if emp_a_mins + task_mins <= 480:
            emp_a_mins += task_mins
            assigned = True
        # Try Emp B
        elif emp_b_mins + task_mins <= 240:
            emp_b_mins += task_mins
            assigned = True
        
        if assigned:
            remaining_tasks.pop(0)
            tasks_assigned_today += 1
        else:
            # Current largest task can't fit in either person's REMAINING time today
            # Try to see if any SMALLER task fits
            smaller_found = False
            for i in range(1, len(remaining_tasks)):
                if emp_a_mins + remaining_tasks[i] <= 480:
                    emp_a_mins += remaining_tasks[i]
                    remaining_tasks.pop(i)
                    tasks_assigned_today += 1
                    smaller_found = True
                    break
                elif emp_b_mins + remaining_tasks[i] <= 240:
                    emp_b_mins += remaining_tasks[i]
                    remaining_tasks.pop(i)
                    tasks_assigned_today += 1
                    smaller_found = True
                    break
            
            if not smaller_found:
                still_assigning = False

    print(f"Day {days}: {tasks_assigned_today} tasks assigned. Minutes Used: {emp_a_mins + emp_b_mins} / 720 (A:{emp_a_mins}, B:{emp_b_mins})")

print(f"Total Days Needed: {days}")
