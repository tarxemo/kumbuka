# Kumbuka — remember everything you have to do

*Kumbuka* is Swahili for **"remember"**. It's a personal work organizer for anyone handling a heavy load of tasks. You can capture things quickly, organize them later, and still keep track of every detail.

**Stack:** Django 5 · Graphene-Django (GraphQL) · React 19 + Vite · Tailwind CSS v4 · Framer Motion

---

## What it does

| Area | What you get |
|---|---|
| **Quick capture** (`N`) | Type a rough note and press Enter, then type the next one. Use **Tab** to switch between saving a *rough note* and a *task*. |
| **Smart typing** | `Send report to @Asha ^fri !high #Finance` fills in the person, due date, priority and project. Unknown people and projects are created for you. |
| **Inbox** | Rough notes wait here. Use **Make task** to turn one into a clear task, or **Archive** it if it's only information. |
| **Discussions** | Meetings, calls and 1:1s have a **live notes** pad that saves as you type. Lines that start with `[]`, `todo:`, `action:` or `->` can be pulled out as action items. You then organize those items into tasks. Each discussion also holds a summary, its decisions and any shared links. |
| **Tasks** | Each task has a status (To do / In progress / Waiting / Done / Cancelled), a priority, a due date, the people involved and who asked for it. It also has a project, a checklist, resource links, and a timeline of updates and changes. |
| **List & Board** | The list is grouped by Overdue / Today / This week / Later / No date. On the board you can drag cards between statuses. |
| **People** | Search for someone, pick them, or create them as you type. Each person's page shows what *they asked you to do*, what they're involved in, and your discussions with them. |
| **Today** | Shows your focus (pinned tasks), overdue items, what's due today, in progress, waiting on others, the next 7 days, and recent discussions. |
| **Daily review** | A guided 5-step check: empty the inbox, handle overdue tasks, follow up on waiting items, give every task a date, and pick tomorrow's focus. |
| **Search** (`Ctrl K`) | Search across tasks, people, discussions, projects and notes, or create something from the search box. |
| **Accounts** | Anyone can sign up. Each account's data is private to that user. Sign-in uses tokens, and the tokens are stored hashed. |
| **Dark mode** | Toggle it in the sidebar or in Settings. |

Keyboard shortcuts: `N` quick capture, `T` new task, `Ctrl K` or `/` search, `Esc` close.

---

## Run it locally

You need **Python 3.11+** and **Node 20+**.

### 1. Backend (Django + GraphQL)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # Windows: copy .env.example .env
python manage.py makemigrations accounts core
python manage.py migrate
python manage.py createsuperuser   # optional, for /admin
python manage.py runserver
```

The API runs at **http://localhost:8000/graphql/**. With `DEBUG=True`, this address also opens GraphiQL in the browser.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:8000
npm run dev
```

Open **http://localhost:5173** and create an account.

### PostgreSQL (optional)

SQLite is the default. To use PostgreSQL, uncomment `psycopg[binary]` in `requirements.txt` and set `DB_ENGINE=postgres` and the `DB_*` values in `backend/.env`.

---

## Deploying (e.g. an Ubuntu server)

1. **Backend**
   - In `backend/.env`, set `DJANGO_DEBUG=False`, a long `DJANGO_SECRET_KEY`, your domain or IP in `DJANGO_ALLOWED_HOSTS`, and your frontend URL in `CORS_ALLOWED_ORIGINS`.
   - Run `pip install gunicorn`.
   - Run `python manage.py collectstatic`.
   - Start it with `gunicorn kumbuka.wsgi:application --bind 0.0.0.0:8000`.
2. **Frontend**
   - Set `VITE_API_URL` to the public backend URL.
   - Run `npm run build`.
   - Serve `frontend/dist/` with nginx. Use `try_files $uri /index.html;` so that page refreshes work.
3. Put both behind nginx with HTTPS (certbot).

---

## Project layout

```
kumbuka/
├── backend/
│   ├── kumbuka/          settings, urls, root GraphQL schema
│   ├── accounts/         sign up / sign in, hashed bearer tokens, profile
│   └── core/             Task, Subtask, Link, Activity, Capture, Discussion, Person, Project + GraphQL
└── frontend/
    └── src/
        ├── lib/          api client, queries, smart-typing parser, dates, theme/auth
        ├── components/   Layout, TaskDrawer, TaskForm, PersonPicker, QuickCapture, CommandPalette, UI kit
        └── pages/        Today, Inbox, Tasks, Discussions, People, Projects, Review, Settings, Auth
```

## GraphQL at a glance

- **Queries:** `me`, `dashboard(today)`, `tasks(status, due, priority, personId, projectId, discussionId, search)`, `task(id)`, `people(search)`, `person(id)`, `projects`, `discussions(search)`, `discussion(id)`, `captures(state)`, `search(q)`
- **Mutations:** `register`, `login`, `logout`, `updateProfile`, `changePassword`, `createTask`, `updateTask`, `setTaskStatus`, `toggleTaskPin`, `deleteTask`, `addTaskNote`, `addSubtask`, `updateSubtask`, `deleteSubtask`, `addLink`, `deleteLink`, `getOrCreatePerson`, `createPerson`, `updatePerson`, `deletePerson`, `createProject`, `updateProject`, `deleteProject`, `createDiscussion`, `updateDiscussion`, `saveRoughNotes`, `extractActions`, `deleteDiscussion`, `addCapture`, `updateCapture`, `deleteCapture`, `convertCapture`

Send `Authorization: Bearer <token>` with every request after you sign in.

## A habit that makes it work

1. **During a conversation:** open the discussion and type rough notes. Don't stop to organize.
2. **Right after:** run **Pull out action items**, then **Make task** on each one. Fill in the due date, who asked for it, and who is involved.
3. **End of day:** spend 10 minutes on the **Daily review**.
4. **Next morning:** start from **Today**.
# kumbuka
