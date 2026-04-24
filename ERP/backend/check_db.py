from app import create_app
from app.models.master import Client
from app.extensions import db

app = create_app()
with app.app_context():
    clients = Client.query.all()
    print(f"Total Clients: {len(clients)}")
    for c in clients:
        print(c.to_dict())
