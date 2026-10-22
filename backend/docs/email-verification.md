# LearnOS Backend — Email Verification

## 1. Introduction

Email verification is a security feature that confirms a user has access to the email address they provide during registration.

In LearnOS, a newly registered user receives an email containing a verification link. When the user opens that link, the frontend sends the verification token to the backend. The backend validates the token and marks the user's email as verified.

**Technology used:**

- **Express.js and TypeScript:** Build the API endpoints and application logic.
- **Prisma ORM:** Store users and verification tokens in PostgreSQL.
- **Nodemailer:** Send verification emails.
- **SMTP:** Transfer email messages through an email provider, such as Gmail.
- **Node.js Crypto:** Generate secure verification tokens and hash them.

## 2. How Email Verification Works

The complete process consists of the following steps:

1. A user registers with their name, email, and password.
2. The backend checks whether the email is already registered and hashes the password.
3. A database transaction creates the user and a verification token record.
4. The backend sends an email containing the original verification token in a link.
5. The user opens the link, and the frontend submits the token to the verification endpoint.
6. The backend hashes the submitted token and searches for its matching database record.
7. The backend checks whether the token exists, has expired, or has already been used.
8. If the token is valid, the backend marks it as used and updates the user's `emailVerifiedAt` field.
9. The account's email is now verified.

### System Flow

User → Registration API → PostgreSQL → Email Service → SMTP Provider → User's Inbox → Verification API → PostgreSQL

## 3. Setting Up the Email Service

### 3.1 Installing Nodemailer

Nodemailer is a Node.js library that allows an application to send emails through SMTP or supported email services.

Install the dependencies in the backend directory:

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

The `nodemailer` package sends emails, while `@types/nodemailer` provides TypeScript type definitions.

### 3.2 Understanding SMTP

SMTP stands for **Simple Mail Transfer Protocol**. It is a protocol used to send email messages between email clients and servers.

For example, when LearnOS sends a verification email:

1. Nodemailer prepares the message.
2. It connects to Gmail's SMTP server.
3. It authenticates using the configured credentials.
4. It submits the email to Gmail.
5. Gmail accepts or rejects the message.

An accepted message is not guaranteed to reach the recipient's inbox; it may still be delayed, filtered as spam, or rejected later.

### 3.3 Configuring Environment Variables

Store the SMTP configuration in the backend's `.env` file.

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
EMAIL_FROM=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
EMAIL_VERIFICATION_TOKEN_EXPIRATION_MINUTES=15
```

**Important:** Gmail generally requires an App Password for this SMTP authentication method. An App Password requires 2-Step Verification to be enabled on the Google Account. Use the appropriate credentials for your chosen email provider.

Never commit `.env` to GitHub or expose SMTP credentials in API responses or logs.

### 3.4 Creating the Nodemailer Transporter

A transporter holds the SMTP connection configuration and is used to send messages.

```typescript
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});
```

For Gmail, port `465` uses a secure TLS connection. Port `587` is another common option and normally uses STARTTLS.

The transporter can be reused for multiple email requests rather than recreated for every message.

## 4. Database Design

Email verification requires the database to track both the user's verification status and the tokens issued to them.

### 4.1 User Model

The `User` model includes:

```prisma
emailVerifiedAt DateTime?
emailVerificationTokens EmailVerificationToken[]
```

The nullable `emailVerifiedAt` field represents verification status:

- `null`: The user's email has not been verified.
- A timestamp: The user's email has been verified.

The relation allows a user to have multiple verification-token records over time.

### 4.2 EmailVerificationToken Model

```prisma
model EmailVerificationToken {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  @@index([userId, expiresAt])
}
```

The model contains:

- `id`: Unique identifier for the token record.
- `userId`: Identifies the account the token belongs to.
- `tokenHash`: Hash of the original verification token.
- `expiresAt`: Date and time after which the token is invalid.
- `usedAt`: Timestamp indicating whether the token has been consumed.
- `createdAt`: Time when the token record was created.

The `onDelete: Cascade` relation means deleting a user also deletes their associated verification-token records.

After modifying the Prisma schema, create and apply a migration using the team's established migration workflow. Then regenerate Prisma Client if required by the project's setup.

## 5. Generating a Verification Token

Node.js provides the `crypto` module for generating secure random values.

```typescript
import crypto from "node:crypto";

const token = crypto.randomBytes(32).toString("hex");

const tokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");
```

The original token is sent to the user. Its SHA-256 hash is stored in the database.

A 32-byte random token encoded as hexadecimal contains 64 characters.

### Why store a hash instead of the original token?

If someone gains read access to the database, they should not immediately be able to use stored verification tokens.

When a user submits the original token, the backend hashes it using the same algorithm. The resulting hash can be compared against the stored `tokenHash`.

This is a different purpose from password hashing: verification tokens are randomly generated secrets, whereas passwords are user-chosen and should be processed with a password-hashing algorithm such as Argon2 or bcrypt.

## 6. Sending the Verification Email

The email service prepares a message containing the verification link.

Example:

```typescript
const verificationUrl = new URL(
  "/verify-email",
  FRONTEND_URL
);

verificationUrl.searchParams.set("token", token);
```

If the frontend URL is `http://localhost:3000`, the resulting link will resemble:

`http://localhost:3000/verify-email?token=...`

The email can contain:

- A welcome message.
- A link or button to verify the email address.
- The expiration period.
- Instructions to ignore the message if the recipient did not register.

The frontend page reads the token from the URL and sends it to the backend's verification endpoint.

The frontend page does not independently mark the account as verified. That decision must be made by the backend.

## 7. Registration and Token Creation

During registration, the backend creates the user and verification token within a Prisma transaction.

The transaction ensures that the user and token record are created together. If either database operation fails, the transaction rolls back.

The original token is retained in memory long enough to send the email, while only the hash is persisted.

The email should be sent **after the transaction commits**. SMTP is an external operation and should not be held inside a database transaction.

If the email fails after the transaction commits, the user and token record still exist. The application can allow the user to request another verification email.

## 8. Resending a Verification Email

LearnOS provides a resend-verification endpoint for users who did not receive the original email or whose token expired.

**Endpoint:**

`POST /api/v1/auth/resend-verification`

Example request:

```json
{
  "email": "student@example.com"
}
```

The service performs these operations:

1. Finds the user by email.
2. Checks whether the account exists and is already verified.
3. Generates a new random token.
4. Deletes or invalidates previous unused tokens.
5. Stores the new token's hash and expiration time.
6. Sends the new verification email.

For a public endpoint, unknown email addresses and already-verified accounts should receive the same generic response to reduce email enumeration.

For example:

```json
{
  "message": "If an eligible account exists, a verification email will be sent."
}
```

The endpoint should also be rate-limited to prevent abuse.

## 9. Verifying an Email Address

**Endpoint:**

`POST /api/v1/auth/verify-email`

Example request:

```json
{
  "token": "the-original-token-from-the-email"
}
```

The frontend extracts the token from the verification link and submits it in the request body.

### Backend verification process

1. Hash the submitted token using SHA-256.
2. Find the matching `EmailVerificationToken` record.
3. Reject the request if the token does not exist.
4. Check whether `expiresAt` is in the future.
5. Reject the token if `usedAt` is not `null`.
6. Reject verification if the user is already verified.
7. Mark the token as used.
8. Set the user's `emailVerifiedAt` timestamp.

The token consumption and user update should occur in the same database transaction. Conditional updates help prevent concurrent requests from consuming the same token successfully.

A successful response can be:

```json
{
  "message": "Email verified successfully"
}
```

An invalid, expired, or previously used token should produce an appropriate client error.

## 10. Error Handling and Reliability

Several situations can prevent verification emails from being delivered.

### SMTP authentication failure

Gmail may reject authentication with an error such as `535-5.7.8 Username and Password not accepted`.

Check the SMTP username, App Password, environment-variable loading, host, and port.

### Missing user

If the supplied email does not match a user, the resend service should not create a token or send an email. The public endpoint should still return its generic response.

### Expired token

Once the expiration time has passed, the token must be rejected. The user can request a new verification email.

### Email delivery failure

SMTP errors should be handled by the service and centralized error middleware. A later resend request can generate another token and attempt delivery again.

Automatic retries can be added later using a background job queue such as BullMQ with Redis. Retries should be bounded and should distinguish temporary failures from permanent ones.

## 11. Security Considerations

The implementation should follow these practices:

- Generate cryptographically secure random tokens.
- Store token hashes rather than original tokens.
- Give tokens a limited lifetime.
- Allow each token to be used only once.
- Invalidate previous unused tokens when issuing a replacement.
- Use database transactions for token consumption and account verification.
- Validate request bodies with Zod.
- Rate-limit registration, verification, and resend endpoints as appropriate.
- Return generic responses from public resend endpoints.
- Keep SMTP credentials in environment variables.
- Never log original verification tokens or SMTP passwords.
- Avoid placing verification tokens in analytics, third-party resources, or application logs.
- Require verified email addresses for protected actions when the application's authorization rules demand it.

## 12. Testing the Feature

Test the implementation using Postman and Prisma Studio.

| Test case | Expected result |
|---|---|
| Register a new user | User and verification-token record are created |
| Send verification email | Email contains a working verification link |
| Verify with a valid token | `emailVerifiedAt` is populated |
| Reuse a token | Request is rejected |
| Submit a random token | Request is rejected |
| Submit an expired token | Request is rejected |
| Resend a verification email | A fresh token is created and sent |
| Resend for an already-verified account | No new verification email is sent |
| Submit an unknown email to resend | Generic response is returned |
| SMTP authentication fails | Error is handled without exposing credentials |

In Prisma Studio, inspect the `User` and `EmailVerificationToken` models to confirm that database state changes as expected.

A successful verification should leave the user with a non-null `emailVerifiedAt` value and the consumed token with a non-null `usedAt` value.

## 13. Conclusion

Email verification in LearnOS combines a database-backed token system with an external email service.

Prisma manages the users and token records, Node.js Crypto generates and hashes tokens, Nodemailer submits messages through SMTP, and Express exposes the registration, resend, and verification endpoints.

The central security rule is that the backend—not the frontend—determines whether a token is valid and whether an account becomes verified. Using expiring, single-use tokens and transactional database updates helps make the feature reliable and secure.

### Key endpoints

- `POST /api/v1/auth/register` — Creates the account and initiates verification.
- `POST /api/v1/auth/resend-verification` — Issues and emails a replacement token.
- `POST /api/v1/auth/verify-email` — Validates the token and verifies the account.