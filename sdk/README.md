# Swagger + Python + Go API Clients
This directory provides a shared API integration path for the same `k8s-admin` server:
- Swagger/OpenAPI contract: `openapi/k8s-admin.yaml`
- Python client: `sdk/python/client.py`
- Go client: `sdk/go/client/client.go`

## Python
```bash
cd sdk/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python example.py
```

## Go
```bash
cd sdk/go
go run ./cmd/adminctl --base-url http://localhost:3000 --username admin --password change-me
```

## Notes
- Both clients use cookie-based session auth by calling `/api/auth/login` first.
- Keep the OpenAPI file and client methods in sync whenever API routes change.
