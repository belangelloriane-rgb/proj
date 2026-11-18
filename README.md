# Booknook — Library Dashboard

A library management dashboard with full **CRUD** functionality, built with **Express.js** and **MySQL**, styled in a warm, aesthetic brown theme.

## Features

- **Dashboard** – stats (titles, copies, members, active loans, overdue), books-by-genre chart, recent activity
- **Books** – create, read, update, delete, and search
- **Members** – create, read, update, delete, and search (unique emails)
- **Loans** – borrow a book, mark it returned, edit the due date, delete records
- Availability tracking: you can't lend a book with no copies left
- Sample data is seeded automatically on the first run

## Tech stack

| Layer    | Tech                          |
| -------- | ----------------------------- |
| Backend  | Node.js, Express.js           |
| Database | MySQL (`mysql2`)              |
| Frontend | HTML, CSS, vanilla JavaScript |

## Getting started

### 1. Requirements

- [Node.js](https://nodejs.org) 18 or newer
- A running MySQL server (MySQL Community Server, XAMPP, Laragon, MariaDB, etc.)

### 2. Install

```bash
npm install
```

### 3. Configure the database connection

Copy `.env.example` to `.env` and set your MySQL details:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=library_db
PORT=3000
```

> On XAMPP / Laragon the default user is usually `root` with an empty password.

### 4. Run

```bash
npm start
```

Open **http://localhost:3000**

The app creates the `library_db` database, all tables, and the sample data automatically on first run. If you'd rather set it up manually, import `database.sql` instead.

## Project structure

```
library-dashboard/
├── server.js        # Express server + REST API
├── db.js            # MySQL connection, tables, seed data
├── database.sql     # Optional manual schema
├── .env.example     # Database settings template
├── package.json
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Database schema

- **books** – id, title, author, genre, published_date, copies, created_at
- **members** – id, name, email (unique), phone, joined_at
- **loans** – id, book_id → books, member_id → members, borrowed_at, due_date, returned_at

## API endpoints

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| GET    | `/api/stats`        | Dashboard statistics   |
| GET    | `/api/books`        | List / search books    |
| POST   | `/api/books`        | Add a book             |
| PUT    | `/api/books/:id`    | Update a book          |
| DELETE | `/api/books/:id`    | Delete a book          |
| GET    | `/api/members`      | List / search members  |
| POST   | `/api/members`      | Add a member           |
| PUT    | `/api/members/:id`  | Update a member        |
| DELETE | `/api/members/:id`  | Delete a member        |
| GET    | `/api/loans`        | List loans             |
| POST   | `/api/loans`        | Create a loan          |
| PUT    | `/api/loans/:id`    | Update / return a loan |
| DELETE | `/api/loans/:id`    | Delete a loan          |

## Deploying to Vercel

Vercel runs the Express app as a serverless function and serves the `public/` folder from its CDN. Vercel does **not** host MySQL, so you need a cloud MySQL database.

### 1. Create a cloud MySQL database

[TiDB Cloud Starter](https://www.pingcap.com/tidb-cloud-starter/) is MySQL-compatible and has a free tier. Create a cluster, then open its **Connect** dialog and copy the host, port, username, and password (generate a password if asked). Note the database name it shows (for example `test`).

You do not need to create tables yourself. The app creates them and adds sample data the first time it runs.

### 2. Push the project to GitHub

Do not commit `.env`. It is already in `.gitignore`.

### 3. Import the repo in Vercel

In Vercel choose **Add New > Project**, pick the repo, and leave the build settings as they are. Before deploying, add these **Environment Variables**:

| Name          | Value                                    |
| ------------- | ---------------------------------------- |
| `DB_HOST`     | host from your cloud database            |
| `DB_PORT`     | port from your cloud database (TiDB is usually `4000`) |
| `DB_USER`     | username                                 |
| `DB_PASSWORD` | password                                 |
| `DB_NAME`     | database name from the Connect dialog    |
| `DB_SSL`      | `true`                                   |

### 4. Deploy

Click **Deploy**, then open the Vercel URL. Open it once yourself so the tables and sample data get created.

If the page loads but data does not, check **Logs** in the Vercel dashboard. The usual cause is a wrong environment variable. Change it, then redeploy.

## Troubleshooting

- **`Could not connect to MySQL`** – make sure the MySQL server is running and the credentials in `.env` are correct.
- **`ER_ACCESS_DENIED_ERROR`** – wrong username or password in `.env`.
- **`ER_NOT_SUPPORTED_AUTH_MODE`** – on older `mysql2` setups with MySQL 8, run:
  `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';`
- **Upgrading from an earlier version** – the books table changed (ISBN and year were replaced by a published date). Drop the old database once so it is rebuilt: `DROP DATABASE library_db;` then run `npm start` again.
