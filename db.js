require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};
// Cloud MySQL providers (TiDB Cloud, etc.) require an encrypted connection
if (String(process.env.DB_SSL).toLowerCase() === 'true') {
  config.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
}
const DB_NAME = process.env.DB_NAME || 'library_db';
const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Manila'; // servers on Vercel run in UTC

let pool;

// Small helpers so the rest of the app stays tidy
const all = async (sql, params = []) => (await pool.query(sql, params))[0];
const get = async (sql, params = []) => (await all(sql, params))[0];
const run = async (sql, params = []) => (await pool.query(sql, params))[0]; // { insertId, affectedRows }

// Today (+/- offset days) as 'YYYY-MM-DD' in the app's timezone
const localDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(Date.now() + offsetDays * 86400000)
  );

async function init() {
  // 1. Create the database if it doesn't exist yet.
  //    Cloud databases often don't allow this (the database already exists), so failure is fine.
  try {
    const conn = await mysql.createConnection(config);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4`);
    await conn.end();
  } catch (e) {
    console.warn('Skipped creating the database:', e.message);
  }

  // 2. Connection pool (dates come back as 'YYYY-MM-DD' strings)
  pool = mysql.createPool({
    ...config,
    database: DB_NAME,
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 3,
    enableKeepAlive: true,
  });

  // 3. Tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      title      VARCHAR(255) NOT NULL,
      author     VARCHAR(255) NOT NULL,
      genre      VARCHAR(100) NOT NULL DEFAULT 'General',
      published_date DATE NOT NULL,
      copies     INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      name      VARCHAR(255) NOT NULL,
      email     VARCHAR(255) NOT NULL UNIQUE,
      phone     VARCHAR(50),
      joined_at DATE NOT NULL
    ) ENGINE=InnoDB`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      book_id     INT NOT NULL,
      member_id   INT NOT NULL,
      borrowed_at DATE NOT NULL,
      due_date    DATE NOT NULL,
      returned_at DATE NULL,
      FOREIGN KEY (book_id)   REFERENCES books(id)   ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

  // 4. Seed sample data on first run
  const { n } = await get('SELECT COUNT(*) AS n FROM books');
  if (Number(n) === 0) await seed();
}

async function seed() {
  const books = [
    ['Noli Me Tangere', 'Jose Rizal', 'Classic', '1887-03-21', 3],
    ['El Filibusterismo', 'Jose Rizal', 'Classic', '1891-09-18', 2],
    ['Pride and Prejudice', 'Jane Austen', 'Romance', '1813-01-28', 2],
    ['The Hobbit', 'J.R.R. Tolkien', 'Fantasy', '1937-09-21', 4],
    ['1984', 'George Orwell', 'Dystopian', '1949-06-08', 3],
    ['Sapiens', 'Yuval Noah Harari', 'History', '2011-01-01', 2],
    ['Atomic Habits', 'James Clear', 'Self-Help', '2018-10-16', 5],
    ['Clean Code', 'Robert C. Martin', 'Technology', '2008-08-01', 2],
    ['To Kill a Mockingbird', 'Harper Lee', 'Classic', '1960-07-11', 3],
    ['Dune', 'Frank Herbert', 'Science Fiction', '1965-08-01', 2],
  ];
  for (const b of books) {
    await run('INSERT INTO books (title, author, genre, published_date, copies) VALUES (?, ?, ?, ?, ?)', b);
  }

  const members = [
    ['Maria Santos', 'maria.santos@example.com', '09171234567', localDate(-300)],
    ['Juan Dela Cruz', 'juan.delacruz@example.com', '09287654321', localDate(-250)],
    ['Angel Reyes', 'angel.reyes@example.com', '09352221100', localDate(-200)],
    ['Liza Mendoza', 'liza.mendoza@example.com', '09065558899', localDate(-120)],
  ];
  for (const m of members) {
    await run('INSERT INTO members (name, email, phone, joined_at) VALUES (?, ?, ?, ?)', m);
  }

  // Loan dates are relative to today so the demo always has an overdue loan
  const loans = [
    [1, 1, localDate(-20), localDate(-6), null], // overdue
    [4, 2, localDate(-5), localDate(9), null],
    [7, 3, localDate(-3), localDate(11), null],
    [5, 1, localDate(-60), localDate(-46), localDate(-48)], // returned
  ];
  for (const l of loans) {
    await run('INSERT INTO loans (book_id, member_id, borrowed_at, due_date, returned_at) VALUES (?, ?, ?, ?, ?)', l);
  }
}

// Runs init() once and shares the result. If it fails, the next call tries again.
let readyPromise = null;
const ready = () => {
  if (!readyPromise) {
    readyPromise = init().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
};

module.exports = { ready, all, get, run, localDate };
