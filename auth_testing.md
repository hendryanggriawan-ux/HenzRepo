# Auth Testing Playbook (POS Bengkel)

Auth = username/password + JWT Bearer token (bukan cookie, agar jalan di LAN http).

Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "owner"}).pretty()
db.users.findOne({role: "owner"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, unique index on users.username, index on login_attempts.identifier.

Step 2: API Testing
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
TOKEN=$(curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"username":"owner","password":"Bengkel#2026"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s "$API/api/auth/me" -H "Authorization: Bearer $TOKEN"
```
- Login returns {token, user}. /me returns the same user.
- 5 failed logins for same ip+username → HTTP 429 for 15 minutes.
- Kasir token → 403 on owner-only endpoints (/api/reports/*, /api/settings PUT, /api/items POST, /api/users, PUT /api/work-orders/{id}).
