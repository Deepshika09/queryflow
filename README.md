# QueryFlow — Serverless Inquiry Management System

QueryFlow is a serverless web application that allows users to submit inquiries and authorized administrators to retrieve and manage them. It demonstrates an AWS-based workflow with request validation, secure access, and persistent data storage.

## Live Demo

**Frontend:** https://d2o670fn9dzsau.cloudfront.net/

## Features

- Submit inquiries through a web form.
- Validate input and handle invalid requests.
- Store inquiry data in Amazon DynamoDB.
- Retrieve inquiries through a protected admin endpoint.
- Authenticate administrators using Amazon Cognito.
- Apply API throttling to help control excessive requests.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Hosting:** Amazon S3, Amazon CloudFront
- **API:** Amazon API Gateway
- **Compute:** AWS Lambda (Python)
- **Database:** Amazon DynamoDB
- **Authentication:** Amazon Cognito
- **Infrastructure:** AWS SAM

## Architecture

```text
User
  |
  v
CloudFront + S3
(React Frontend)
  |
  v
API Gateway <--- Cognito Authentication
  |
  v
AWS Lambda
  |
  v
Amazon DynamoDB
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/inquiries` | Submit a new inquiry |
| GET | `/admin/inquiries` | Retrieve inquiries (protected) |

The admin endpoint requires authentication configured through Amazon Cognito.

## Run Locally

### Prerequisites

- Node.js and npm
- Python
- AWS CLI
- AWS SAM CLI
- Docker

### Frontend

```bash
npm install
npm run dev
```

Configure `VITE_API_BASE_URL` to point