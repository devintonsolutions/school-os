# LearnOS — Core LMS API Testing Checklist (Categories & Courses)

**Author:** Developer 2 (Core LMS Backend Engineer)  
**Tooling Compatibility:** Postman / Bruno / HTTPie / cURL  
**Base URL:** `http://localhost:4000/api` (or `/api/v1` upon prefix update)  

---

## 1. Environment & Auth Tokens

| Variable | Description | Example Value |
|---|---|---|
| `{{adminToken}}` | JWT with role `ADMIN` | Bearer token from `POST /api/auth/login` |
| `{{teacherToken}}` | JWT with role `TEACHER` (Course Owner) | Bearer token from `POST /api/auth/login` |
| `{{otherTeacherToken}}` | JWT with role `TEACHER` (Not Owner) | Bearer token from `POST /api/auth/login` |
| `{{studentToken}}` | JWT with role `STUDENT` | Bearer token from `POST /api/auth/login` |
| `{{categoryId}}` | UUID of created test category | `11111111-1111-1111-1111-111111111111` |
| `{{courseId}}` | UUID of created test course | `22222222-2222-2222-2222-222222222222` |

---

## 2. Categories API Endpoints

### 2.1 POST `/categories` (Create Category)

* **Success (201 Created) — Admin**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Body:**
    ```json
    {
      "name": "Backend Development",
      "description": "Node.js, Express, databases, and system architecture."
    }
    ```
  * **Expected Response:** `201 Created`
    ```json
    {
      "success": true,
      "message": "Category created successfully",
      "data": {
        "id": "c1a2b3c4-...",
        "name": "Backend Development",
        "description": "Node.js, Express, databases, and system architecture."
      }
    }
    ```

* **Validation Error (400 Bad Request) — Name too short**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Body:** `{ "name": "B" }`
  * **Expected Response:** `400 Bad Request` (`success: false`, `errors` array).

* **Conflict (409 Conflict) — Duplicate Name**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Body:** `{ "name": "Backend Development" }`
  * **Expected Response:** `409 Conflict`, `"message": "Category name already exists"`.

* **Forbidden (403 Forbidden) — Non-Admin**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:** `{ "name": "DevOps" }`
  * **Expected Response:** `403 Forbidden`.

* **Unauthorized (401 Unauthorized)**
  * **Headers:** *(None)*
  * **Expected Response:** `401 Unauthorized`.

---

### 2.2 GET `/categories` (List Categories)

* **Success (200 OK) — Any Authenticated User**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Expected Response:** `200 OK`
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "c1a2b3c4-...",
          "name": "Backend Development",
          "description": "Node.js, Express, databases, and system architecture.",
          "_count": {
            "courses": 0
          }
        }
      ]
    }
    ```

---

### 2.3 GET `/categories/:id` (Get Category by ID)

* **Success (200 OK)**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Path:** `/categories/{{categoryId}}`
  * **Expected Response:** `200 OK`.

* **Not Found (404 Not Found)**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Path:** `/categories/00000000-0000-0000-0000-000000000000`
  * **Expected Response:** `404 Not Found`.

* **Validation Error (400 Bad Request) — Invalid UUID**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Path:** `/categories/invalid-uuid`
  * **Expected Response:** `400 Bad Request` (`Invalid UUID format`).

---

### 2.4 PATCH `/categories/:id` (Update Category)

* **Success (200 OK) — Admin**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Body:**
    ```json
    {
      "description": "Updated backend engineering curriculum."
    }
    ```
  * **Expected Response:** `200 OK`, `"message": "Category updated successfully"`.

* **Validation Error (400 Bad Request) — Empty Payload**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Body:** `{}`
  * **Expected Response:** `400 Bad Request` (`At least one field must be provided for update`).

* **Forbidden (403 Forbidden) — Teacher**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:** `{ "name": "New Name" }`
  * **Expected Response:** `403 Forbidden`.

---

### 2.5 DELETE `/categories/:id` (Delete Category)

* **Success (200 OK) — Admin**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Expected Response:** `200 OK`, `"message": "Category deleted successfully"`.

* **Forbidden (403 Forbidden) — Teacher / Student**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Expected Response:** `403 Forbidden`.

---

## 3. Courses API Endpoints

### 3.1 POST `/courses` (Create Course)

* **Success (201 Created) — Teacher**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:**
    ```json
    {
      "title": "Advanced Node.js Architecture",
      "description": "Deep dive into clean architecture, Express, and Prisma.",
      "thumbnail": "https://example.com/thumbnails/nodejs.png",
      "categoryId": "{{categoryId}}"
    }
    ```
  * **Expected Response:** `201 Created`
    ```json
    {
      "success": true,
      "message": "Course created successfully",
      "data": {
        "id": "e4f5a6b7-...",
        "title": "Advanced Node.js Architecture",
        "description": "Deep dive into clean architecture, Express, and Prisma.",
        "thumbnail": "https://example.com/thumbnails/nodejs.png",
        "status": "DRAFT",
        "teacherId": "teacher-user-id",
        "categoryId": "c1a2b3c4-...",
        "createdAt": "2026-10-12T...",
        "updatedAt": "2026-10-12T...",
        "teacher": {
          "id": "teacher-user-id",
          "firstName": "John",
          "lastName": "Doe",
          "avatarUrl": null
        },
        "category": {
          "id": "c1a2b3c4-...",
          "name": "Backend Development",
          "description": "..."
        }
      }
    }
    ```

* **Validation Error (400 Bad Request) — Non-HTTPS Thumbnail**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:**
    ```json
    {
      "title": "Valid Course Title",
      "thumbnail": "http://insecure-site.com/image.png"
    }
    ```
  * **Expected Response:** `400 Bad Request` (`Thumbnail URL must use secure HTTPS protocol`).

* **Category Not Found (404 Not Found)**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:**
    ```json
    {
      "title": "Valid Title",
      "categoryId": "00000000-0000-0000-0000-000000000000"
    }
    ```
  * **Expected Response:** `404 Not Found` (`Category not found`).

* **Forbidden (403 Forbidden) — Student**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Body:** `{ "title": "Student Course Attempt" }`
  * **Expected Response:** `403 Forbidden`.

---

### 3.2 GET `/courses` (List & Filter Courses)

* **Success (200 OK) — Student (Sees Only PUBLISHED Courses)**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Query Params:** `?page=1&limit=10`
  * **Expected Behavior:** Returns only courses where `status === "PUBLISHED"`. Even if `?status=DRAFT` is requested, draft courses are never leaked.
  * **Response Format:**
    ```json
    {
      "success": true,
      "data": [...],
      "meta": {
        "page": 1,
        "limit": 10,
        "total": 5,
        "totalPages": 1
      }
    }
    ```

* **Success (200 OK) — Teacher (Sees PUBLISHED + Own Draft/Archived Courses)**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Query Params:** `?search=Node.js`
  * **Expected Behavior:** Matches published courses and the teacher's own drafts matching keyword.

* **Success (200 OK) — Admin (Sees All Courses Across All Statuses)**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Query Params:** `?status=DRAFT`
  * **Expected Behavior:** Returns all draft courses across all teachers.

---

### 3.3 GET `/courses/my` (Teacher Own Courses)

* **Success (200 OK) — Teacher**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Expected Response:** `200 OK` with paginated courses owned by the authenticated teacher.

* **Forbidden (403 Forbidden) — Student**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Expected Response:** `403 Forbidden`.

---

### 3.4 GET `/courses/:id` (Get Course by ID)

* **Success (200 OK) — Published Course (Any User)**
  * **Headers:** `Authorization: Bearer {{studentToken}}`
  * **Path:** `/courses/{{courseId}}`
  * **Expected Response:** `200 OK` (includes nested `modules` and `lessons`).

* **Draft Course Visibility Check:**
  * **When Requested by Student:** Returns `404 Not Found` (protects draft secrecy, never leaks 403).
  * **When Requested by Non-Owner Teacher:** Returns `404 Not Found`.
  * **When Requested by Owner Teacher:** Returns `200 OK`.
  * **When Requested by Admin:** Returns `200 OK`.

---

### 3.5 PATCH `/courses/:id` (Update Course Metadata)

* **Success (200 OK) — Owner Teacher**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:**
    ```json
    {
      "title": "Mastering Node.js & Distributed Systems"
    }
    ```
  * **Expected Response:** `200 OK`, `"message": "Course updated successfully"`.

* **Forbidden (403 Forbidden) — Non-Owner Teacher**
  * **Headers:** `Authorization: Bearer {{otherTeacherToken}}`
  * **Body:** `{ "title": "Tampered Title" }`
  * **Expected Response:** `403 Forbidden`.

* **Bad Request (400 Bad Request) — Cannot Edit Archived Course**
  * *(Prerequisite: Course status is ARCHIVED)*
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:** `{ "title": "New Title" }`
  * **Expected Response:** `400 Bad Request` (`Archived courses cannot be edited`).

---

### 3.6 PATCH `/courses/:id/status` (Update Lifecycle Status)

* **Transition: DRAFT $\rightarrow$ PUBLISHED (Fails if Empty Curriculum)**
  * *(Prerequisite: Course has 0 modules or modules with 0 lessons)*
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:** `{ "status": "PUBLISHED" }`
  * **Expected Response:** `400 Bad Request` (`Course must have at least one module containing at least one lesson before publishing`).

* **Transition: DRAFT $\rightarrow$ PUBLISHED (Success with Curriculum)**
  * *(Prerequisite: Course has $\ge 1$ module with $\ge 1$ lesson)*
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:** `{ "status": "PUBLISHED" }`
  * **Expected Response:** `200 OK`, `"status": "PUBLISHED"`.

* **Transition: PUBLISHED $\rightarrow$ ARCHIVED (Success)**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:** `{ "status": "ARCHIVED" }`
  * **Expected Response:** `200 OK`, `"status": "ARCHIVED"`.

* **Transition: ARCHIVED $\rightarrow$ PUBLISHED — Teacher Blocked**
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Body:** `{ "status": "PUBLISHED" }`
  * **Expected Response:** `403 Forbidden` (`Only administrators can unarchive courses`).

* **Transition: ARCHIVED $\rightarrow$ PUBLISHED — Admin Allowed**
  * **Headers:** `Authorization: Bearer {{adminToken}}`
  * **Body:** `{ "status": "PUBLISHED" }`
  * **Expected Response:** `200 OK`, `"status": "PUBLISHED"`.

---

### 3.7 DELETE `/courses/:id` (Delete Course)

* **Conflict (409 Conflict) — Attempt to Delete Published Course**
  * *(Prerequisite: Course status is PUBLISHED)*
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Expected Response:** `409 Conflict` (`Only draft courses can be deleted. Please archive published courses instead.`).

* **Conflict (409 Conflict) — Attempt to Delete Draft Course with Existing Enrollments**
  * *(Prerequisite: Course status is DRAFT but enrollments count > 0)*
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Expected Response:** `409 Conflict` (`Cannot delete course with existing enrollments. Please archive the course instead.`).

* **Success (200 OK) — Draft Course with 0 Enrollments**
  * *(Prerequisite: Course is DRAFT and enrollments count is 0)*
  * **Headers:** `Authorization: Bearer {{teacherToken}}`
  * **Expected Response:** `200 OK`, `"message": "Course deleted successfully"`.

* **Forbidden (403 Forbidden) — Non-Owner Teacher**
  * **Headers:** `Authorization: Bearer {{otherTeacherToken}}`
  * **Expected Response:** `403 Forbidden`.
