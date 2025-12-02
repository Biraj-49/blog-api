# Blog API

Simple Django REST-style API for managing blog posts with PostgreSQL storage.

## Setup

1) Create and activate a virtual environment (recommended).
2) Install dependencies:
```bash
pip install -r requirements.txt
```
3) Configure environment variables (at minimum `DATABASE_URL`):
```bash
export DATABASE_URL="postgresql://neondb_owner:your_password_here@ep-example-123456.us-east-1.aws.neon.tech/neondb?sslmode=require"

export SECRET_KEY="change-me"
export DEBUG=true
```
4) Run migrations and start the server:
```bash
python manage.py migrate
python manage.py runserver
```

## Frontend (React + Vite)

Located in `frontend`. A dev proxy forwards `/posts` to the Django server on `127.0.0.1:8000`.

```bash
cd frontend
npm install
npm run dev   # opens on http://127.0.0.1:5173
```

If your API runs elsewhere, set `VITE_API_BASE="https://your-host/posts"` when starting the dev server.

## Endpoints

- `POST /posts` – create a post.
- `GET /posts` – list posts (optional `?term=` to filter by title/content/category).
- `GET /posts/<id>` – retrieve a post.
- `PUT /posts/<id>` – update a post.
- `DELETE /posts/<id>` – remove a post.

### Example requests

Create:
```bash
curl -X POST http://localhost:8000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Blog Post","content":"Content","category":"Technology","tags":["Tech","Programming"]}'
```

Search:
```bash
curl "http://localhost:8000/posts?term=tech"
```

Update:
```bash
curl -X PUT http://localhost:8000/posts/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated","content":"Updated content","category":"Technology","tags":["Tech","Programming"]}'
```

Delete:
```bash
curl -X DELETE http://localhost:8000/posts/1
```
