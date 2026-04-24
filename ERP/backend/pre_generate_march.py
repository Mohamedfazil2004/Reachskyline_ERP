from app import create_app
import requests
from datetime import date

# Note: We use the actual route logic by calling it directly via app context
# because we don't have a valid JWT token for an external request easily here.
from flask import json
from app.routes.automation import generate_tasks
from flask_jwt_extended import create_access_token
from app.models.user import User

app = create_app()

def generate_for_date(target_date_str):
    with app.app_context():
        # We need a mock request context and a user
        admin = User.query.filter_by(role='Admin').first()
        if not admin:
            print("No Admin user found to generate tasks.")
            return

        with app.test_request_context(
            path='/api/automation/generate-tasks',
            method='POST',
            data=json.dumps({'date': target_date_str}),
            content_type='application/json'
        ):
            # Mock JWT identity
            from unittest.mock import patch
            with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request'):
                with patch('flask_jwt_extended.utils.get_jwt_identity', return_value=admin.id):
                    response = generate_tasks()
                    print(f"Response for {target_date_str}: {response[0].get_data(as_text=True)}")

if __name__ == '__main__':
    # Generating for March 1st to 5th as a "split" example
    print("Generating tasks for initial days of March...")
    for d in range(1, 6):
        date_str = f"2026-03-0{d}"
        generate_for_date(date_str)
