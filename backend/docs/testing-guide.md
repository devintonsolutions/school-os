# School OS — Testing Guide (Schemas & APIs)

This guide explains how to test both the **database schemas** and the **Express REST APIs** in School OS.

---

## 1. Testing the Database Schemas

### Option A: Automated Schema Verification Script (Fastest)
We have an automated verification script that connects to Supabase, queries the models, and verifies relations:

```bash
cd backend
npm run test:schema
```

**What it tests:**
- Connects to Supabase PostgreSQL using Prisma Client.
- Verifies model querying (`User`, `Category`, `Module`, `Lesson`, `Assignment`, `Quiz`, etc.).
- Verifies unique constraint checks and upsert operations.

---

### Option B: Prisma Studio (Visual GUI)
Prisma Studio provides a graphical interface in your browser to inspect and manipulate data in all 23 models:

```bash
cd backend
npx prisma studio
```
Then open [http://localhost:5555](http://localhost:5555) in your web browser. You can click on any table (`User`, `Course`, `Assignment`, etc.) to view, add, edit, or delete records.

---

### Option C: Prisma Schema Validation
To ensure that your schema syntax, types, and relations are valid without connecting to the database:

```bash
npx prisma validate
```

---

## 2. Testing the Backend APIs

### Step 1: Start the Development Server
In your terminal:

```bash
cd backend
npm run dev
```

You should see:
```text
Server running on http://localhost:4000
```

---

### Step 2: Health Check Endpoint
Test if the server is alive and responding:

- **Browser**: Open `http://localhost:4000/health`
- **cURL**:
  ```bash
  curl http://localhost:4000/health
  ```
- **Expected Response**:
  ```json
  { "status": "ok" }
  ```

---

### Step 3: Testing Authentication Endpoints

You can use the ready-made test file **[`requests.http`](file:///D:/Projects/SchoolOS_Project/school-os/backend/requests.http)** directly inside VS Code (with the **REST Client** extension), or use **Postman** / **cURL**.

#### 1. Register a New Student (`POST /api/auth/signup`)
- **URL**: `http://localhost:5000/api/auth/signup`
- **Method**: `POST`
- **Body** (`application/json`):
  ```json
  {
    "firstName": "Alex",
    "lastName": "Smith",
    "email": "alex.smith@example.com",
    "password": "Password123!"
  }
  ```
- **Expected Status**: `201 Created`

---

#### 2. Log In (`POST /api/auth/login`)
- **URL**: `http://localhost:5000/api/auth/login`
- **Method**: `POST`
- **Body** (`application/json`):
  ```json
  {
    "email": "alex.smith@example.com",
    "password": "Password123!"
  }
  ```
- **Response**:
  ```json
  {
    "user": {
      "id": "uuid...",
      "email": "alex.smith@example.com",
      "firstName": "Alex",
      "lastName": "Smith",
      "role": "STUDENT"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "random_crypto_string..."
    }
  }
  ```
> **Tip**: Copy the `accessToken` for authenticated requests!

---

#### 3. View Current Profile (`GET /api/auth/me`) [Protected]
- **URL**: `http://localhost:5000/api/auth/me`
- **Method**: `GET`
- **Headers**:
  ```text
  Authorization: Bearer <YOUR_ACCESS_TOKEN>
  ```
- **Expected Status**: `200 OK`

---

#### 4. Update Profile (`PATCH /api/auth/me`) [Protected]
- **URL**: `http://localhost:5000/api/auth/me`
- **Method**: `PATCH`
- **Headers**:
  ```text
  Authorization: Bearer <YOUR_ACCESS_TOKEN>
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "firstName": "Alexander",
    "bio": "Studying Computer Science"
  }
  ```

---

#### 5. Refresh Access Token (`POST /api/auth/refresh`)
- **URL**: `http://localhost:5000/api/auth/refresh`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "refreshToken": "<YOUR_REFRESH_TOKEN>"
  }
  ```

---

#### 6. Logout (`POST /api/auth/logout`)
- **URL**: `http://localhost:5000/api/auth/logout`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "refreshToken": "<YOUR_REFRESH_TOKEN>"
  }
  ```
- **Expected Response**: Revokes the refresh token from the database.
