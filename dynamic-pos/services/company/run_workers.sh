#!/bin/bash

# Run Tenant Seeding Consumer in background
python manage.py runconsumer &

# Run WebSocket Notification Bridge in background
python manage.py run_websocket_bridge &

# Wait for any process to exit
wait -n
  
# Exit with status of process that exited first
exit $?
