# Expense Voucher Management System

A full-stack web application for creating, submitting, reviewing, approving, and tracking employee expense vouchers. The application provides role-based workflows for **Employees**, **Directors**, and the **Accounts Team**, replacing manual voucher paperwork with a centralized digital process.

## Demo

[Watch the project demonstration](https://drive.google.com/file/d/1KqeYuYbBTtlYvsCqQHjQLEQ_Tgao7_NF/view?usp=sharing)

## Features

### Employee
- Sign in securely.
- Create, edit, and delete draft expense vouchers.
- Attach supporting bills or receipts.
- Submit vouchers for director review.
- View previously created vouchers and their statuses.
- Manage profile information and change password.

### Director
- View vouchers pending review.
- Approve or reject submitted vouchers.
- Provide a rejection reason when rejecting a voucher.
- View previously processed vouchers.

### Accounts Team
- View vouchers for financial monitoring.
- Access approved vouchers.
- Review supporting bill attachments where authorized.

### Authentication and Security
- JWT-based authentication.
- Spring Security role-based authorization.
- BCrypt password hashing.
- Password reset using an OTP workflow.
- Protected REST API endpoints.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, JavaScript, Vite |
| Backend | Java 17, Spring Boot, Spring Web MVC |
| Security | Spring Security, JWT, BCrypt |
| Persistence | Spring Data JPA, Hibernate |
| Database | MySQL 8 |
| Build tool | Gradle |
| API testing | Postman |
| Version control | Git and GitHub |

## Roles and Workflow

1. An **Employee** logs in and creates an expense voucher as a draft.
2. The employee adds expense details and uploads a supporting bill, if applicable.
3. The employee submits the voucher for approval.
4. A **Director** reviews the submitted voucher and approves or rejects it.
5. The **Accounts Team** can view vouchers, including approved claims, for financial tracking.

The exact status values and transition rules are defined by the backend implementation and database schema.

## Project Structure

```text
expense-voucher-management/
├── frontend/                 # React application
├── src/                      # Spring Boot application source
│   ├── main/
│   └── test/
├── database/
│   └── schema.sql            # Exported MySQL database schema
├── uploads/                  # Runtime bill uploads (do not commit receipts)
├── .env.example              # Example environment configuration
├── build.gradle              # Gradle build configuration
├── settings.gradle
├── gradlew
├── gradlew.bat
└── README.md
```

> The directory tree is an overview. Consult the repository for exact Java package names, frontend folders, and any additional configuration files.

## Prerequisites

Install the following before running the project:

- **Java JDK 17**
- **Node.js** and **npm**
- **MySQL Server 8**
- **Git**
- An IDE such as IntelliJ IDEA, VS Code, or Spring Tool Suite

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/virajkhanvilkar/expense-voucher-management.git
cd expense-voucher-management
```

### 2. Create the MySQL database

Log in to MySQL and create the application database:

```sql
CREATE DATABASE IF NOT EXISTS expense_voucher_db;
```

The exported database structure is available at [`database/schema.sql`](database/schema.sql).

To import it from the project root:

```bash
mysql -u root -p expense_voucher_db < database/schema.sql
```

**Note:** `schema.sql` is a schema-only export. It does not include user accounts or application records. If the application is configured with Hibernate `ddl-auto=update`, Hibernate may also create or update tables during startup; avoid mixing approaches without checking the resulting schema.

### 3. Configure backend settings

Use [`.env.example`](.env.example) as a reference for the settings your local installation requires. **Do not commit real passwords, signing secrets, or OTP/email credentials.**

Spring Boot settings may be supplied through environment variables or your local `application.properties` / `application.yml` configuration. For example:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/expense_voucher_db
spring.datasource.username=root
spring.datasource.password=${DB_PASSWORD}
```

Set any additional JWT, email/OTP, upload directory, and CORS settings required by the application's configuration. The variable names must match the actual placeholders used in the source code; merely creating a `.env` file does not make Spring Boot load it automatically.

### 4. Start the Spring Boot backend

**Windows:**

```bat
gradlew.bat bootRun
```

**macOS / Linux:**

```bash
./gradlew bootRun
```

The backend is expected to be available at `http://localhost:8080` when configured to use port 8080.

### 5. Start the React frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite (commonly `http://localhost:5173`). Configure the frontend API base URL to point to the backend as required by the source code.

## Database Schema

The database contains these core tables:

| Table | Purpose |
| --- | --- |
| `users` | User profiles, credentials, departments, and roles |
| `vouchers` | Employee expense vouchers, amounts, dates, descriptions, and statuses |
| `voucher_approvals` | Director decisions and approval/rejection records |
| `password_reset_otps` | OTP data used by the password reset flow |

The authoritative table definitions, column types, indexes, and constraints are in [`database/schema.sql`](database/schema.sql).

## REST API Documentation

**Base URL:** `http://localhost:8080`

Endpoints that require authentication should be called with a JWT:

```http
Authorization: Bearer <your-jwt-token>
```

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Authenticate a user |
| POST | `/api/auth/forgot-password` | Initiate password recovery |
| POST | `/api/auth/reset-password` | Reset password using the recovery flow |

**Login request example:**

```json
{
  "username": "employee1",
  "password": "your-password"
}
```

Use the token returned by the login endpoint in subsequent authenticated requests.

### Employee Voucher Management

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/vouchers/draft/{employeeId}` | Create a draft voucher |
| GET | `/api/vouchers/employee/{employeeId}` | List an employee's vouchers |
| GET | `/api/vouchers/employee/{employeeId}/{voucherId}` | View a specific employee voucher |
| PUT | `/api/vouchers/draft/{employeeId}/{voucherId}` | Update a draft voucher |
| DELETE | `/api/vouchers/draft/{employeeId}/{voucherId}` | Delete a draft voucher |
| POST | `/api/vouchers/upload-bill` | Upload a supporting bill |
| POST | `/api/vouchers/submit/{employeeId}/{voucherId}` | Submit a draft for approval |

For bill uploads, send a `multipart/form-data` request with the file under the `file` field. Supported file formats and size limits are controlled by the backend validation rules.

### Director Review

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/director/pending` | List pending vouchers |
| GET | `/api/director/processed` | List processed vouchers |
| POST | `/api/director/approve/{directorId}/{voucherId}` | Approve a voucher |
| POST | `/api/director/reject/{directorId}/{voucherId}` | Reject a voucher |

The approval and rejection endpoints may require additional request-body fields, such as a signature path or rejection reason, according to their controller DTOs.

### Accounts

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/accounts/vouchers` | View vouchers |
| GET | `/api/accounts/vouchers/approved` | View approved vouchers |

### Bill Access

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/vouchers/{voucherId}/bill` | Retrieve a voucher's bill attachment |

### User Profile

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/profile/me` | View current user's profile |
| PUT | `/api/profile/me` | Update current user's profile |
| POST | `/api/profile/change-password` | Change current user's password |

**Change-password request example:**

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

> **API note:** These routes summarize the project endpoints documented during development. Confirm exact request fields, validation constraints, response shapes, and HTTP status codes against the current controller/DTO implementations before submitting or integrating an external client.

## Testing with Postman

1. Run the Spring Boot application and ensure MySQL is available.
2. Call `POST /api/auth/login` with valid credentials.
3. Copy the JWT from the login response.
4. For protected endpoints, choose **Authorization → Bearer Token** in Postman and paste the JWT.
5. Test the employee, director, and accounts endpoints using accounts with the appropriate roles.
6. Test error cases such as invalid credentials, unauthorized roles, invalid voucher IDs, and rejected uploads.

## Security Considerations

- Passwords should be stored only as BCrypt hashes.
- JWT signing keys and database credentials must remain outside version control.
- Backend authorization must enforce role restrictions independently of frontend route protection.
- Voucher access should verify that the authenticated employee owns the requested resource; a URL `employeeId` alone is not proof of ownership.
- Uploaded bills can contain sensitive personal or financial information. Keep them out of the public repository and restrict file access to authorized users.
- OTPs should have expiration and abuse protections according to the implemented recovery flow.

## Environment and Git Hygiene

- Use [`.env.example`](.env.example) to document non-secret configuration requirements.
- Keep local `.env` files, real secrets, build output, and uploaded receipts out of Git.
- Review `.gitignore` before committing new files.
- Do not commit actual employee financial records or personal documents.

Suggested ignore entries, if they are not already present:

```gitignore
.env
.env.local
uploads/bills/
frontend/node_modules/
frontend/dist/
.gradle/
build/
```

## Assumptions and Limitations

- The system supports three primary roles: **EMPLOYEE**, **DIRECTOR**, and **ACCOUNTS**.
- A voucher is prepared by an employee and then reviewed by a director.
- The accounts workflow is focused on viewing and monitoring vouchers.
- The schema export contains table definitions, not production data or sample users.
- Deployment configuration, seeded accounts, email delivery, and any optional AI features depend on what has actually been implemented and configured in the repository.

## Future Enhancements

- AI-assisted voucher drafting from natural-language descriptions.
- Receipt data extraction and validation.
- Advanced reports, filters, and export functionality.
- Audit logs and notifications for voucher status changes.
- Deployment with managed database and secure file storage.

## Repository

[GitHub — Expense Voucher Management System](https://github.com/virajkhanvilkar/expense-voucher-management)

## Author

**Viraj Rajesh Khanvilkar**  
[GitHub](https://github.com/virajkhanvilkar) · [LinkedIn](https://www.linkedin.com/in/viraj-khanvilkar-42b63a338)
