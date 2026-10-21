# ITUE301 - Practical 7: Authentication and Middleware Pipeline

Task Management app with JWT authentication, bcrypt password hashing and server-side validation (Node.js, Express, MongoDB/Mongoose).

## Setup
1. Install Node.js v18+ and MongoDB (local) or use MongoDB Atlas.
2. `npm install`
3. Edit `.env` (copy of `.env.example`): set `MONGO_URI` and a long random `JWT_SECRET`.
4. `npm start` then open http://localhost:5000

## API
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Hash password, save user, 201 |
| POST | /api/auth/login | No | Verify password, return JWT (1h) |
| GET | /api/auth/me | Yes | Logged-in user details (supplementary) |
| GET | /api/tasks | Yes | List own tasks |
| POST | /api/tasks | Yes | Create task (title required) |
| GET/PUT/DELETE | /api/tasks/:id | Yes | Read / update / delete own task |

Pipeline: `Client -> [Auth middleware] -> [Validation middleware] -> Controller`

## Postman test flow (Step 8)
1. POST /api/auth/register  body: `{"name":"Test","email":"test@example.com","password":"secret123"}` -> 201
2. POST /api/auth/login  same email/password -> copy `token`
3. GET /api/tasks WITHOUT header -> 401 (screenshot this)
4. Add header `Authorization: Bearer <token>` -> GET /api/tasks -> 200
5. POST /api/tasks `{}` -> 400 (missing title); `{"title":"Learn JWT"}` -> 201
6. Tamper one character of the token -> 401 "Invalid token"
7. Wait for expiry (or set JWT_EXPIRES_IN=10s temporarily) -> 401 "Token expired"

## Key Questions (answers)
**1. Why hash passwords even in a demo?**
If the database leaks, plain-text passwords expose every user (and other sites where they reused the password). bcrypt is a one-way hash, slow on purpose, and adds a unique salt automatically, so stolen hashes are very hard to crack. Hashing is a habit, not an optional production-only step.

**2. What does the auth middleware verify? What if the token is missing/expired?**
It checks the Authorization header format, then `jwt.verify` confirms the signature (not tampered, signed with our JWT_SECRET) and that `exp` has not passed. It then sets `req.user`. Missing, malformed, tampered or expired token -> `401 Unauthorized` and the request never reaches the controller.

**3. Why validate on the server if the frontend validates?**
Frontend checks can be bypassed (Postman, curl, edited JS). The server is the only trusted layer, so it must reject bad input before it reaches the database.

## Supplementary problems (done)
- `/api/auth/me` returns the user from the decoded JWT.
- Frontend `request()` helper redirects to login when a protected request returns 401.
- Logout button removes the token from localStorage.

## Common mistakes avoided
- Passwords hashed with bcrypt, never stored plain; `select:false` so hashes are not returned.
- `bcrypt.compare()` used (not `===`).
- JWT secret from `.env` only; server refuses to start without it.
- `jwt.verify` wrapped in try/catch -> 401, no crash.
- "Bearer <token>" format checked.
- Same error message for wrong email or wrong password.
- Tasks are scoped to the owner (`user` field), so users cannot see each other's tasks.
- Invalid ObjectIds, malformed JSON and duplicate emails return clean 400/409 errors.
