# Personal Finance Tracker - Backend

This is the backend for the Personal Finance Tracker application, built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js
- MongoDB

## Getting Started

1.  **Clone the repository.**

2.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the `backend` directory and add the following, replacing the placeholder values:
    ```
    MONGO_URI=your_mongodb_connection_string
    PORT=5000
    JWT_SECRET=your_jwt_secret
    JWT_REFRESH_SECRET=your_jwt_refresh_secret
    ACCESS_TOKEN_EXPIRE=15m
    REFRESH_TOKEN_EXPIRE=7d
    ```

5.  **Run the server:**
    - For development (with auto-reloading):
      ```bash
      npm run dev
      ```
    - For production:
      ```bash
      npm start
      ```

The API will be running at `http://localhost:5000`.

## API Endpoints

### Auth

- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Login a user and get tokens.
- `POST /api/auth/refresh`: Get a new access token using a refresh token.
- `GET /api/auth/logout`: Logout a user and clear cookies.
- `GET /api/auth/me`: Get the current logged-in user.
- `POST /api/auth/forgot-password`: (Placeholder)
- `POST /api/auth/reset-password`: (Placeholder)

### Transactions

- `GET /api/transactions`: Get all transactions for the logged-in user.
- `POST /api/transactions`: Add a new transaction.
- `PUT /api/transactions/:id`: Update a transaction.
- `DELETE /api/transactions/:id`: Delete a transaction.

### Budgets

- `GET /api/budgets`: Get all budgets for the logged-in user.
- `POST /api/budgets`: Add a new budget.
- `PUT /api/budgets/:id`: Update a budget.
- `DELETE /api/budgets/:id`: Delete a budget.
