# Expense Voucher Management System

A web-based application developed to streamline expense voucher submission, approval, and tracking for Prachay Securities Private Limited.

## About the Project

The Expense Voucher Management System digitizes the expense voucher workflow by providing role-based access, voucher status tracking, and a structured approval process.

The application is built using React for the frontend, Spring Boot for the backend, and MySQL for data storage.

## Features

- **Authentication:** Login and role-based access control.
- **Voucher Management:** Manage expense vouchers according to user permissions.
- **Director Approval:** Approve or reject submitted vouchers.
- **Status Tracking:** Track vouchers through different workflow stages.
- **Role-Based Authorization:** Separate access for Employees, Directors, and Accounts.
- **REST API Integration:** Connect the frontend with the backend.
- **MySQL Database:** Store and manage application data.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite, JavaScript |
| Backend | Java 17, Spring Boot |
| Database | MySQL |
| Build Tool | Gradle |
| Security | Spring Security, token-based authentication |
| Tools | Git, GitHub, VS Code, Eclipse, MySQL Workbench |

## User Roles

- **Employee:** Access employee-specific voucher operations.
- **Director:** Review and approve or reject vouchers.
- **Accounts:** Access account-related voucher operations.

## Voucher Workflow

`DRAFT → PENDING_APPROVAL → APPROVED / REJECTED`

## Project Structure

```text
expense-voucher-management/
├── expense-voucher-frontend/
├── src/
│   └── main/
├── gradle/
├── build.gradle
├── settings.gradle
├── gradlew
├── gradlew.bat
├── .gitignore
└── README.md
```

## Prerequisites

- JDK 17
- Node.js and npm
- MySQL Server
- Git

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/virajkhanvilkar/expense-voucher-management.git
cd expense-voucher-management
```

### 2. Configure the database

Create the database in MySQL Workbench:

```sql
CREATE DATABASE expense_voucher_db;
```

Configure your database connection and required application secrets in your local Spring Boot configuration. Do not commit real passwords or JWT secrets.

### 3. Start the backend

From the project root, run:

```cmd
gradlew.bat bootRun
```

Backend URL: `http://localhost:8080`

### 4. Start the frontend

Open a second terminal:

```cmd
cd expense-voucher-frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Development

This project uses Git and GitHub for source control and version management.

```bash
git status
git add .
git commit -m "Describe your changes"
git push
```

## Security

- Protect restricted API endpoints with authorization.
- Store passwords using secure password hashing.
- Keep database credentials and JWT secrets out of source control.
- Protect confidential financial records and uploaded documents.

## Author

**Viraj Khanvilkar**

GitHub: [virajkhanvilkar](https://github.com/virajkhanvilkar)

## License

This project is intended for internship and organizational use. Distribution or open-source licensing should be authorized by the organization before publication.
