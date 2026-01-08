# Real-Time Chat App

A lightweight real-time chat app with a Vite + React frontend and a Node/Express + WebSocket backend. Messages and users are stored in MySQL.

## Requirements

- Node.js 18+ (20+ recommended)
- MySQL 8+ (XAMPP is fine)

## Setup

1) Install dependencies

```bash
npm install
```

2) Create the environment file

```bash
copy .env
```

Update `MYSQL_URL` in `.env` to match your MySQL credentials, for example:

```text
MYSQL_URL=mysql://root@localhost:3306/real_time_chat_app
```

3) Initialize the database tables

```bash
npm run db:init
```

4) Start the backend server

```bash
npm run dev:server
```

5) Start the frontend

```bash
npm run dev
```

Vite proxies `/api` requests to the backend at `http://localhost:4000`.

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run dev:server` - start the backend server
- `npm run db:init` - create the `users` and `messages` tables
- `npm run build` - build the frontend
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint

## Authentication

Users sign up with a unique username, password, and display name. Log in with the same username and password to get the same user id.

## Notes

- If MySQL denies access, double-check the username/password in `MYSQL_URL`.
- If you use XAMPP, root often has no password by default.
