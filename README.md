# Expense Voucher Management System

A web-based application developed to streamline expense voucher submission, approval, and tracking for Prachay Securities Private Limited.

## About the Project

The Expense Voucher Management System digitizes the expense management workflow by providing employee voucher operations, Director approval, role-based access control, and voucher status tracking.

**Technology Stack:** React.js, Spring Boot, Java 17, MySQL, Gradle, Spring Security, JWT, and BCrypt.

## Features

- User authentication and JWT-based security.
- Role-based access for Employees, Directors, and Accounts.
- Expense voucher creation and management.
- Director approval and rejection workflow.
- Voucher status tracking.
- Password reset using OTP records.
- Email configuration for application notifications and password-reset functionality.
- MySQL database integration.

## User Roles

| Role | Responsibility |
|---|---|
| EMPLOYEE | Manage expense vouchers and track their status. |
| DIRECTOR | Review, approve, or reject vouchers. |
| ACCOUNTS | Access voucher information for accounting operations. |

## Voucher Workflow

`DRAFT → PENDING_APPROVAL → APPROVED / REJECTED`

The available status transitions are governed by the application's implemented business rules.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite, JavaScript |
| Backend | Java 17, Spring Boot |
| Database | MySQL |
| Build Tool | Gradle |
| Authentication | Spring Security, JWT |
| Password Security | BCrypt |
| Email Configuration | SMTP credentials through environment variables |
| API Testing | Postman |
| Version Control | Git and GitHub |

## Project Structure

```text
expense-voucher-management/
├── expense-voucher-frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── src/
│   └── main/
│       ├── java/
│       └── resources/
├── gradle/
├── build.gradle
├── settings.gradle
├── gradlew
├── gradlew.bat
├── .gitignore
├── .env.example
├── database/
│   └── schema.sql
└── README.md
```

The database directory and its schema file should be added if they do not already exist.

## Prerequisites

- JDK 17
- Node.js and npm
- MySQL Server and MySQL Workbench
- Git

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/virajkhanvilkar/expense-voucher-management.git
cd expense-voucher-management
```

### 2. Create the database

Execute the following query in MySQL Workbench:

```sql
CREATE DATABASE IF NOT EXISTS expense_voucher_db;
```

### 3. Configure environment variables

Configure the required variables in your IDE's run configuration or your local runtime environment.

See `.env.example` for the required configuration names. Spring Boot does not automatically load `.env` files without additional configuration.

Required settings include:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `MAIL_USERNAME`
- `MAIL_APP_PASSWORD`

Use the exact property names expected by the application's configuration classes.

### 4. Run the backend

From the project root, execute:

**Windows:**

```bat
gradlew.bat bootRun
```

**Linux/macOS:**

```bash
./gradlew bootRun
```

Backend URL: `http://localhost:8080`

### 5. Run the frontend

Open another terminal:

```bash
cd expense-voucher-frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, typically `http://localhost:5173`.

## Database Schema

Database name: `expense_voucher_db`

The application uses MySQL tables managed through JPA entities and Hibernate configuration.

### 1. `users`

Stores user accounts and role information.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key, auto-increment |
| `created_at` | DATETIME(6) | Account creation timestamp |
| `department` | VARCHAR(100) | Department name |
| `employee_code` | VARCHAR(50) | Employee identifier, nullable |
| `full_name` | VARCHAR(100) | User's full name |
| `password_hash` | VARCHAR(255) | Hashed password |
| `role` | ENUM | ACCOUNTS, DIRECTOR, EMPLOYEE |
| `username` | VARCHAR(100) | Unique username |
| `email` | VARCHAR(254) | Unique email, nullable |

### 2. `vouchers`

Stores expense voucher details and workflow status.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key, auto-increment |
| `amount` | DECIMAL(12,2) | Claimed expense amount |
| `created_at` | DATETIME(6) | Creation timestamp |
| `department_name` | VARCHAR(100) | Department associated with the voucher |
| `employee_signature_path` | VARCHAR(500) | Employee signature path, nullable |
| `expense_category` | VARCHAR(100) | Expense category |
| `expense_date` | DATE | Date of expense |
| `expense_description` | VARCHAR(2000) | Expense details, nullable |
| `expense_title` | VARCHAR(150) | Voucher title |
| `status` | ENUM | Current voucher status |
| `updated_at` | DATETIME(6) | Last update timestamp |
| `voucher_date` | DATE | Voucher date |
| `voucher_number` | VARCHAR(30) | Unique voucher number, nullable |
| `employee_id` | BIGINT | Employee reference |
| `bill_photo` | VARCHAR(500) | Bill or receipt path, nullable |

### 3. `voucher_approvals`

Stores Director decisions and approval-related information.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key, auto-increment |
| `decision_date` | DATETIME(6) | Decision timestamp |
| `director_signature_path` | VARCHAR(500) | Director signature path, nullable |
| `rejection_reason` | VARCHAR(1000) | Rejection explanation, nullable |
| `director_id` | BIGINT | Director reference |
| `voucher_id` | BIGINT | Unique voucher reference |

### 4. `password_reset_otps`

Stores OTP records associated with password reset operations.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key, auto-increment |
| `attempts` | INT | Number of verification attempts |
| `created_at` | DATETIME(6) | Record creation timestamp |
| `email` | VARCHAR(254) | Email associated with the reset request |
| `expires_at` | DATETIME(6) | OTP expiration timestamp |
| `otp_hash` | VARCHAR(64) | Hashed OTP value |

### Relationships

- A user can be associated with multiple vouchers through `vouchers.employee_id`.
- A Director is referenced by `voucher_approvals.director_id`.
- Each voucher has a unique voucher reference in `voucher_approvals.voucher_id`.
- Password reset OTP records are associated with an email address.

The relationships above describe the column references shown in the database. Verify the actual foreign-key constraints and cardinalities against the database DDL before using this documentation as a formal schema specification.

## API Documentation

**Base URL:** `http://localhost:8080`

The application exposes REST APIs for authentication, password recovery, expense voucher management, Director approval, Accounts access, and profile management.

### Authentication

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/login` | Authenticate and obtain a JWT | Public |
| POST | `/api/auth/forgot-password` | Request a password-reset OTP | Public |
| POST | `/api/auth/reset-password` | Reset a password using an OTP | Public |

**Login request:**

```json
{
  "username": "employee_username",
  "password": "your_password"
}
```

The login response includes the user ID, JWT token, username, role, and message.

### Voucher Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/vouchers/draft/{employeeId}` | Create a voucher draft | EMPLOYEE |
| GET | `/api/vouchers/employee/{employeeId}` | List an employee's vouchers | EMPLOYEE |
| GET | `/api/vouchers/employee/{employeeId}/{voucherId}` | Retrieve a voucher | EMPLOYEE |
| PUT | `/api/vouchers/draft/{employeeId}/{voucherId}` | Update a draft | EMPLOYEE |
| DELETE | `/api/vouchers/draft/{employeeId}/{voucherId}` | Delete a draft | EMPLOYEE |
| POST | `/api/vouchers/upload-bill` | Upload a bill or receipt | EMPLOYEE |
| POST | `/api/vouchers/submit/{employeeId}/{voucherId}` | Submit a voucher for approval | EMPLOYEE |

The bill-upload endpoint accepts `multipart/form-data` with a field named `file`. The controller enforces a 5 MB size limit and allows PDF, JPG, JPEG, and PNG file types.

The submit endpoint accepts JSON containing the employee signature path:

```json
{
  "employeeSignaturePath": "path_returned_by_upload"
}
```

### Director Operations

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/director/pending` | List pending vouchers | DIRECTOR |
| GET | `/api/director/processed` | List approved and rejected vouchers | DIRECTOR |
| POST | `/api/director/approve/{directorId}/{voucherId}` | Approve a voucher | DIRECTOR |
| POST | `/api/director/reject/{directorId}/{voucherId}` | Reject a voucher | DIRECTOR |

**Approval request:**

```json
{
  "directorSignaturePath": "signature_file_path"
}
```

**Rejection request:**

```json
{
  "rejectionReason": "Reason for rejection"
}
```

### Accounts Operations

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/accounts/vouchers` | Retrieve all vouchers | ACCOUNTS |
| GET | `/api/accounts/vouchers/approved` | Retrieve approved vouchers | ACCOUNTS |

### Bill File Access

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/vouchers/{voucherId}/bill` | View an uploaded bill | DIRECTOR or ACCOUNTS |

Accounts users can view bills only for approved vouchers, according to the controller implementation.

### Profile Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/profile/me` | Retrieve the authenticated user's profile | Authenticated |
| PUT | `/api/profile/me` | Update the authenticated user's profile | Authenticated |
| POST | `/api/profile/change-password` | Change the authenticated user's password | Authenticated |

**Profile update request:**

```json
{
  "fullName": "Employee Name",
  "email": "employee@example.com",
  "department": "IT",
  "employeeCode": "EMP001"
}
```

**Change-password request:**

```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

The new password must contain between 8 and 100 characters according to the request DTO.

### Authentication Header

Protected endpoints use JWT authentication. Include the token in the HTTP request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

In Postman, select **Authorization → Bearer Token** and enter the token returned by the login endpoint.

### Common HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 OK | Request completed successfully |
| 201 Created | Resource created or file uploaded |
| 204 No Content | Draft deleted successfully |
| 400 Bad Request | Invalid request or validation failure |
| 401 Unauthorized | Authentication required or credentials invalid |
| 403 Forbidden | Access denied |
| 404 Not Found | Resource or bill file not found |
| 500 Internal Server Error | Unexpected server or configuration error |

Actual responses depend on the endpoint, validation rules, service implementation, and exception handling.

### Implementation Notes

- The login, forgot-password, and reset-password endpoints are configured as public routes.
- Voucher routes require the EMPLOYEE role, except the bill-view route, which has separate Director and Accounts authorization.
- Director and Accounts routes are restricted to their respective roles.
- Profile routes require authentication.
- Service-layer ownership checks should ensure that employee and Director IDs in URL parameters match the authenticated user's permissions.


### Testing with Postman

1. Start the Spring Boot backend.
2. Send a login request with valid credentials.
3. Copy the token returned by the API.
4. Select **Authorization → Bearer Token** in Postman.
5. Test protected endpoints and verify role-based access.

Document the exact endpoint mappings, request fields, response formats, and HTTP status codes from the implemented Spring Boot controllers and DTOs before submission. Do not assume that an endpoint exists merely because its functionality is described in the README.

## Assumptions and Development Decisions

- The system supports three roles: EMPLOYEE, DIRECTOR, and ACCOUNTS.
- Voucher operations depend on the authenticated user's permissions.
- Director approval is part of the expense voucher workflow.
- Passwords are stored as hashes rather than plaintext.
- OTP records include an expiry time and an attempt counter.
- MySQL is used for persistent application data.
- JPA and Hibernate are used for database persistence.
- Database and email credentials are supplied through runtime configuration.
- Supporting documents and signatures are represented by file paths in the voucher-related tables.
- The application is intended for development and demonstration; production deployment requires appropriate security, configuration, and data-protection controls.

## Demo Video

Watch the recorded demonstration of the working application:

[**Expense Voucher Management System — Demo Video**](https://drive.google.com/file/d/1KqeYuYbBTtlYvsCqQHjQLEQ_Tgao7_NF/view?usp=sharing)

The video demonstrates the working application. Access depends on the Google Drive sharing permissions.

## Security

- Use BCrypt for password hashing.
- Keep JWT secrets, email app passwords, and database credentials private.
- Enforce authorization on the backend.
- Validate user inputs and protect restricted endpoints.
- Limit access to financial records, uploaded bills, and signatures.
- Avoid committing production credentials or sensitive user data.

## Version Control

```bash
git status
git add README.md .env.example database/
git commit -m "Update project documentation and database schema"
git push origin main
```

Adjust the Git commands if your schema file is stored elsewhere or your active branch differs.

## Author

**Viraj Khanvilkar**

GitHub: https://github.com/virajkhanvilkar

Repository: https://github.com/virajkhanvilkar/expense-voucher-management

## License

This project is intended for internship and organizational use. Distribution or open-source licensing should be authorized by the organization before publication.
