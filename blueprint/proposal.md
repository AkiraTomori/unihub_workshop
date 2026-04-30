# UniHub Workshop — Project Proposal

## 1. Problem Statement
The current management process for "Skills and Career Week" at University A is facing severe limitations due to manual operations. Using Google Forms and manual email confirmations is no longer viable as the event scale continues to expand. Specific consequences include:

Data Inconsistency and Overselling: Google Forms lacks a real-time locking mechanism when registration limits are reached, leading to student numbers exceeding classroom capacity.

Poor User Experience: Students do not receive real-time updates on remaining seats and must wait long periods for manual confirmation emails.

Check-in Bottlenecks: Verifying paper lists or Excel files at the door is time-consuming and causes congestion, especially in auditorium areas with weak mobile signals or no internet connectivity.

Administrative Overload: Administrators spend excessive time processing CSV files from legacy systems, aggregating registration data, and handling refunds manually when errors occur.

## 2. Project Goals
The goal is to build the UniHub Workshop system to digitize and automate the entire event lifecycle, from promotion and registration to the completion of check-ins.

Specific Quantitative and Technical Objectives:

Handle Traffic Spikes: The system must remain stable and process requests smoothly when 12,000 students access it within the first 10 minutes of registration (with 60% of traffic concentrated in the first 3 minutes).

Ensure Data Integrity (0% Race Condition): Strictly prevent scenarios where two students successfully claim the final seat in a 60-person workshop limit.

Offline-First Capability: 100% of check-in records in dead zones must be securely captured on mobile devices and synchronized without data loss once connectivity is restored.

Information Automation: Apply AI to automatically summarize 100% of the workshop PDF documents uploaded by the Organizing Committee.

## 3. User Groups and Needs
The system serves three primary user groups with distinct permissions and needs:

1. Students
Behavior: View schedules, read AI-generated summaries, register for workshops (free/paid), receive QR codes, and present them at the door.

Key Requirement: Fairness (first-come, first-served), immediate system feedback without freezes, and secure payment transactions to prevent incorrect charges.

2. Organizing Committee
Behavior: Create, edit, and cancel workshops; upload PDF documents; view registration statistics.

Key Requirement: A centralized administrative interface and automation of repetitive tasks (sending emails, content summarization) to save manpower.

3. Check-in Staff
Behavior: Use a mobile app to scan student QR codes at the entrance.

Key Requirement: Scanning speed and the application must function normally even when network signals are blocked in auditoriums.

## 4. Scope
A Modular Monolith combined with an Event-Driven architecture was chosen to ensure high feasibility, optimize collaboration, and minimize DevOps overhead, enabling rapid and efficient development.

### 4.1 What is IN Scope:

Blueprint & System Design: Designing C4 Models, Database Schemas, and detailed specifications for technical bottleneck solutions (Rate Limiting, Circuit Breaker, Idempotency).

Core Backend API: Building the primary business logic for permission management, registration, and Distributed Locking using Redis.

Background Workers: Implementing a Message Broker (RabbitMQ) and asynchronous workers for email delivery, nightly CSV synchronization, and AI API calls.

Local-First Mobile Sync: Developing mobile-side SQLite storage logic and batch-sync mechanisms to upload check-in data to the server.

Infrastructure as Code: Providing Docker Compose scripts to launch the entire environment (App, Postgres, Redis, RabbitMQ) with a single command.

### 4.2 What is OUT of Scope:

Integration with real payment gateways using actual currency (Sandbox/Mock APIs from VNPay/Stripe will be used to simulate timeouts).

Production infrastructure deployment on Cloud (AWS/GCP) with Auto-scaling (The project concludes at the Blueprint and Local/Container setup level).

Training specialized AI models (Integration will be done via existing LLM APIs like Google Vertex AI).

## 5. Risk and Constraints
The project must address five critical technical bottlenecks using software engineering principles:

Resource Contention (Race Condition): Hundreds of requests concurrently updating a workshop's seat count.

Proposed Solution: Utilize Redis Atomic Operations.

Spike Traffic: Risk of database crashes and Connection Pool exhaustion during the first 3 minutes.

Proposed Solution: Implement API Gateway Rate Limiting and In-memory Caching.

Unstable Payments: Risk of partner gateways hanging, causing registration flow failures or multiple charges to a user.

Proposed Solution: Apply Circuit Breaker patterns and Idempotency Keys.

Offline Check-in Desync: QR scan data may be lost, duplicated, or recorded with incorrect timestamps.

Proposed Solution: Store-and-Forward Pattern using Local SQLite combined with Device-generated Idempotency IDs.

One-way Legacy Integration (Legacy CSV): The old system lacks an API; exported CSV files may contain errors or duplicates.

Proposed Solution: Background ETL Worker applying Batch Upserts and Error Isolation to prevent interruptions to ongoing processes.
