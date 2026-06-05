# 🤖 AutoMates Business — Employee Assistant & HR Platform

> [!CAUTION]
> 🛡️ **Portfolio Project — All Rights Reserved**
> This repository is shared **for viewing purposes only** to demonstrate the author's skills and experience.
> Copying, using, modifying, or redistributing any part of this code **without explicit written permission** is strictly prohibited.
> See [LICENSE](./LICENSE) for full terms.

<p align="center">
  <img src="https://img.shields.io/badge/Portfolio_Only-%F0%9F%94%92_No_Copying-red?style=for-the-badge" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" />
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

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🤖 **Employee Assistant Chatbot** | AI-powered conversational assistant for employee queries |
| 📅 **FlexHR Sub-system** | Automated timetable generation, shift scheduling, and leave management |
| 🗄️ **PostgreSQL Backend** | Robust relational database with complete HR schema |
| 📱 **Mobile-Ready** | Capacitor integration for iOS/Android deployment |
| 🔗 **Conversational Flows** | JSON-based bot conversation flows |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|----------|
| **Language** | JavaScript (Node.js) |
| **Database** | PostgreSQL |
| **Mobile** | Capacitor |
| **Bot Engine** | Custom JSON flow engine |

---

## 🚀 Installation

> ⚠️ **For evaluation/viewing purposes only.** See [LICENSE](./LICENSE) before running.

```bash
git clone https://github.com/aimanhakimka04/AutoMates_Bussiness_5-.git
npm install
psql -U postgres -d automates_db -f clean_postgres.sql
npm start
```

---

## ⚙️ Configuration

```env
DB_HOST=localhost
DB_NAME=automates_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
```

---

## 📸 Screenshots

> _Screenshots will be added in a future update._

---

## 🔮 Future Work

- [ ] LLM Integration (GPT/Gemini) for natural conversation
- [ ] Payroll Module
- [ ] Attendance Tracking (QR/facial recognition)
- [ ] Push Notifications
- [ ] Analytics Dashboard

---

## 🔒 License

© 2024 Aiman Hakim. **All Rights Reserved.**
This project is shared for **portfolio/evaluation purposes only.**
See [LICENSE](./LICENSE) for full terms.

---

## 👤 Author

**Aiman Hakim** — [@aimanhakimka04](https://github.com/aimanhakimka04)
