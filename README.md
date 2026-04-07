<h1 align="center">🚀 Workvia</h1>

<p align="center">
  <strong>Master Your Workflow — Less management, more building.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Java-21-orange.svg?style=for-the-badge&logo=openjdk" alt="Java">
  <img src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F.svg?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot">
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
</p>

---

## 🧭 Overview

**Workvia** is a modern, real-time, and AI-powered project management platform designed to make teamwork feel effortless. By integrating intelligent automation with a sleek user experience, Workvia removes the friction from project planning.

> "Spend less time managing and more time building."

-----

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🔐 **Secure Auth** | Local Registration (Email Verification/Reset) + **Google OAuth2**. Secured via JWT. |
| 🏢 **Granular RBAC** | Role-Based Access Control: Assign users as `ADMIN`, `MEMBER`, or `VIEWER`. |
| 🤖 **AI Auto-Breakdown** | Uses **DeepSeek API** to instantly turn complex goals into actionable subtasks. |
| ⚡ **Real-Time Engine** | Instant alerts for mentions/assignments via **WebSocket (STOMP)**. |
| ☁️ **Cloud Attachments** | Enterprise storage via **AWS S3** with secure pre-signed URL delivery. |
| 💬 **Rich Collaboration** | Comment system with `@` mentions, Emoji support, and file sharing. |
| 📊 **Productivity Hub** | Interactive dashboards powered by **Recharts** to track status distribution. |
| 🎨 **Adaptive UI** | Fully responsive design with a seamless **Dark / Light mode** toggle. |

-----

## 🛠️ Tech Stack

### 🎨 Frontend

  * **Core:** React 18 (Vite) + TypeScript
  * **Styling:** Tailwind CSS + Lucide Icons
  * **Data Fetching:** TanStack React Query (v5)
  * **State Management:** Server-state caching & sync
  * **Charts:** Recharts

### ⚙️ Backend

  * **Core:** Spring Boot 3 (Java 21)
  * **Security:** Spring Security + JWT + OAuth2
  * **Database:** PostgreSQL + Hibernate (JPA)
  * **Real-time:** Spring WebSocket + STOMP
  * **Services:** AWS SDK (S3), Spring Mail, DeepSeek AI Integration

-----

## 🚀 Getting Started

### 📋 Prerequisites

  * **Runtime:** Node.js (v18+) & JDK 21+
  * **Database:** PostgreSQL (v14+)
  * **Accounts:** AWS (S3 Bucket) & Google Cloud Console (OAuth2 Client)

-----

### 🗄️ 1. Database Setup

Create your local PostgreSQL database:

```sql
CREATE DATABASE workvia;
```

-----

### ⚙️ 2. Backend Setup

Navigate to the backend directory and configure your environment variables in `application.yml` or your IDE's launch profile:

```env
# Database
DB_USERNAME=postgres
DB_PASSWORD=your_db_password

# Services
MAIL_USERNAME=your_gmail_address
MAIL_PASSWORD=your_gmail_app_password
DEEPSEEK_API_KEY=your_ai_api_key

# AWS Configuration
AWS_BUCKET_NAME=your_s3_bucket_name
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Security
JWT_SECRET=your_super_secret_jwt_key_256_bits
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

**Run the application:**

```bash
./mvnw spring-boot:run
```

*API Endpoint: `http://localhost:8080`*

-----

### 💻 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend root:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_API_URL=http://localhost:8080
```

**Start the development server:**

```bash
npm run dev
```

*Web Access: `http://localhost:5173`*

-----
