from app.extensions import db
from app.models.user import User
from app.models.workflow import SocialMediaTask
from datetime import datetime

def generate_activity_code(year, month, client_id, content_type_code):
    """
    Format: [YearDigit][Month][ClientID][ContentType][Count]
    Example: 6 02 103 B 04
    """
    year_digit = str(year)[-1]
    month_str = str(month).zfill(2)
    
    # Strip any non-digit from client_id if it's like C003
    client_id_digits = ''.join(filter(str.isdigit, str(client_id))).zfill(3)
    
    # Count existing tasks for this client, month, and content type
    existing_count = SocialMediaTask.query.filter(
        SocialMediaTask.client_id == client_id,
        SocialMediaTask.content_type == content_type_code,
        SocialMediaTask.activity_code.like(f"{year_digit}{month_str}{client_id_digits}{content_type_code}%")
    ).count()
    
    count_str = str(existing_count + 1).zfill(2)
    
    return f"{year_digit}{month_str}{client_id_digits}{content_type_code}{count_str}"

def get_required_role(activity_type):
    """
    STRICT Mapping:
    Blog / Caption / Script -> Content Writer
    Video Editing / Reel Editing -> Video Editor
    Graphic Design -> Graphic Designer
    """
    at = activity_type.lower()
    
    # Check Content Writer first
    if any(x in at for x in ['blog', 'caption', 'script']):
        return 'content_writer'
    
    # Check Video Editor
    if any(x in at for x in ['video editing', 'reel editing', 'video', 'reel']):
        return 'video_editor'
    
    # Check Graphic Designer
    if any(x in at for x in ['graphic design', 'design', 'poster', 'thumbnail']):
        return 'graphic_designer'
        
    return None

def assign_task(task):
    """
    Auto Assignment Algorithm:
    Step 1: Filter employees by role
    Step 2: Filter availability_status = Available
    Step 3: Filter current_workload < max_daily_capacity
    Sort by: Lowest current_workload, Highest efficiency_score
    """
    required_skill = get_required_role(task.activity_type)
    if not required_skill:
        task.work_status = 'Unassigned'
        return None

    # Filter query
    query = User.query.filter(
        User.availability_status == 'Available',
        User.current_workload < User.max_daily_capacity
    )
    
    if required_skill == 'video_editor':
        query = query.filter(User.is_video_editor == True)
    elif required_skill == 'content_writer':
        query = query.filter(User.is_content_writer == True)
    elif required_skill == 'graphic_designer':
        query = query.filter(User.is_graphic_designer == True)

    # Sort
    eligible_employees = query.order_by(
        User.current_workload.asc(),
        User.efficiency_score.desc()
    ).all()

    if not eligible_employees:
        task.work_status = 'Unassigned'
        return None

    assigned_emp = eligible_employees[0]
    task.assigned_employee_id = assigned_emp.id
    task.work_status = 'Assigned'
    assigned_emp.current_workload += 1
    
    return assigned_emp
