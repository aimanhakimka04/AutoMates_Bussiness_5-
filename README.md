# 🤖 AutoMates Business — Employee Assistant & HR Platform

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" />
</p>

<p align="center">
  <b>An intelligent employee assistant and HR automation platform — combining chatbot AI, timetable management, and HR workflows into one unified business system.</b>
</p>

---

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Screenshots](#screenshots)
- [Future Work](#future-work)

---

## 🔍 Overview

**AutoMates Business (C5)** is an AI-driven business automation platform designed to streamline HR operations and employee communication. It combines a conversational employee assistant chatbot with FlexHR — a sub-system for managing employee timetables, leave applications, and scheduling — all powered by a PostgreSQL backend.

The system is built as a web application with Capacitor integration for potential mobile deployment, making it a cross-platform solution for modern businesses.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🤖 **Employee Assistant Chatbot** | AI-powered conversational assistant for employee queries (leave, schedule, policies) |
| 📅 **FlexHR Sub-system** | Automated timetable generation, shift scheduling, and leave management |
| 🗄️ **PostgreSQL Backend** | Robust relational database with complete HR schema |
| 📱 **Mobile-Ready** | Capacitor integration for wrapping as a native iOS/Android app |
| 📤 **Timetable Migration** | SQL migration scripts for schema evolution |
| 🔗 **Conversational Flows** | JSON-based bot conversation flows |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|----------|
| **Language** | JavaScript (Node.js) |
| **Database** | PostgreSQL |
| **Mobile** | Capacitor (iOS / Android) |
| **Bot Engine** | Custom JSON flow engine |
| **Package Manager** | npm |

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/aimanhakimka04/AutoMates_Bussiness_5-.git
   cd AutoMates_Bussiness_5-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the PostgreSQL database**
   ```bash
   psql -U postgres -c "CREATE DATABASE automates_db;"
   psql -U postgres -d automates_db -f clean_postgres.sql
   psql -U postgres -d automates_db -f timetable_migration.sql
   ```

4. **Start the server**
   ```bash
   npm start
   ```

---

## 🎯 Usage

### Web Access
Navigate to: `http://localhost:3000`

### Employee Assistant
- Employees can ask the chatbot about leave balance, work schedules, HR policies.
- Main flow: `C5-EmployeeAssistant-Main.json`
- HR sub-queries: `C5-FlexHR-Sub.json`

### Mobile App (via Capacitor)
```bash
npx cap add android
npx cap sync
npx cap open android
```

---

## ⚙️ Configuration

Create a `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=automates_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
JWT_SECRET=your_jwt_secret
```

> ⚠️ Never commit `.env` files with real credentials to version control.

---

## 📸 Screenshots

> _Screenshots will be added in a future update._

| Employee Dashboard | Chatbot Interface | Timetable View |
|---|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Chatbot](docs/screenshots/chatbot.png) | ![Timetable](docs/screenshots/timetable.png) |

---

## 🔮 Future Work

- [ ] **AI Model Integration** — Replace JSON flows with an LLM (GPT/Gemini) for natural conversation
- [ ] **Payroll Module** — Auto-calculate salaries based on hours worked and leave records
- [ ] **Attendance Tracking** — QR code or facial recognition check-in
- [ ] **Real-Time Notifications** — Push notifications for shift changes and leave approvals
- [ ] **Multi-Company Support** — Multi-tenant architecture for multiple organisations
- [ ] **Analytics Dashboard** — HR metrics, attendance trends, and workforce insights
- [ ] **Role-Based Access Control** — Separate views for Admin, HR Manager, and Employees

---

## 🤝 Contributing

Pull requests are welcome!

---

## 👤 Author

**Aiman Hakim** — [@aimanhakimka04](https://github.com/aimanhakimka04)
