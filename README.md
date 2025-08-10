# PDF Transparency Application

This project includes both backend and frontend for a PDF Transparency app where users can:

- Register with OTP email verification
- Login securely with JWT
- Upload PDFs for text extraction and chunking
- Ask questions about PDF content with AI-powered answers
- View document and conversation history

---

## Backend (Node.js + Express)

### Features

- User registration with OTP email verification (via Nodemailer + Gmail SMTP)
- Login with JWT authentication
- PDF upload and text extraction (`pdf-parse`)
- Text chunking and embedding with HuggingFace API
- AI question answering with HuggingFace text generation API
- Data storage in MongoDB: users, OTPs, docs, chunks, conversations

### Prerequisites

- Node.js v16+
- MongoDB running locally or remotely
- Gmail account with app password for sending OTP emails
- HuggingFace API key

### Setup

1. Install dependencies:
npm install express multer pdf-parse axios mongodb cors bcryptjs jsonwebtoken nodemailer


Create a .env file in backend root with:

PORT=5050
MONGO_URI=mongodb://127.0.0.1:27017/pdf_transparency
JWT_SECRET=your_jwt_secret_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password


Run the server:
node server.js


Frontend (React + Vite)
Features
Multi-step registration with OTP verification

Login page with JWT token storage

Dashboard to upload PDFs and view uploaded documents

Chat interface to ask questions about PDFs

View conversation history

Prerequisites
Node.js v16+

Yarn or npm

Setup
Navigate to the frontend directory:

bash
Copy
Edit
cd frontend
Install dependencies:

bash
Copy
Edit
npm install
# or
yarn
Configure API base URL

In the frontend .env file (or directly in your config), set:

bash
Copy
Edit
VITE_API_BASE_URL=http://localhost:5050/api
Run the frontend dev server:

bash
Copy
Edit
npm run dev
# or
yarn dev
Open http://localhost:3000 (or the port shown) in your browser.

How to Use
Register a new account on the frontend by providing name, email, phone, and password.

Check your email for the OTP and verify.

Login with your email and password.

Upload a PDF document.

Ask questions about the PDF content.

View past uploaded PDFs and conversation history.

API Endpoints Summary
Auth
POST /api/register - Register and send OTP

POST /api/resend-otp - Resend OTP email

POST /api/verify-otp - Verify OTP and activate account

POST /api/login - Login and receive JWT token

PDF & QA
POST /api/pdf/upload - Upload PDF (Authorization required)

POST /api/question - Ask question about PDF (Authorization required)

GET /api/docs - List user’s uploaded documents (Authorization required)

GET /api/history - List user’s conversation history (Authorization required)

Notes
Backend uses JWT tokens for securing routes. Frontend should send Authorization: Bearer <token> headers.

OTPs expire after 10 minutes.

JWT tokens expire after 7 days.

HuggingFace API key is used for embeddings and generation, so a valid key is required.

Gmail SMTP requires App Password (2FA enabled) for sending OTP emails.
