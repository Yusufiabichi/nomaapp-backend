# NomaApp Backend

AI-powered crop disease and pest diagnosis platform backend, designed for offline-first mobile usage in rural Africa.

## Features

- 🔐 JWT-based authentication with role support (farmer, agronomist, admin)
- 🌾 Farm management with minimal location data collection
- 📸 Crop disease scanning with AI-powered diagnosis
- 🔄 Offline-first sync support (WatermelonDB compatible)
- ☁️ Cloud storage abstraction (AWS S3 / Cloudinary)
- 📊 Admin dashboard with system statistics

CPanel Login
Username:iegpfvuq
Password:6+vgvL2-4SNo2B

POST   /expert/profile              → save Stage 1
POST   /expert/documents            → upload to Cloudinary, save Stage 2
GET    /expert/assessment/questions → fetch MCQ + image questions
POST   /expert/assessment/submit    → score, store result, update stage
GET    /expert/verification-status  → current stage + status (for dashboard)

-- Admin routes (for later dashboard) --
GET    /admin/experts               → list all pending experts
GET    /admin/experts/:id           → view expert + documents
PATCH  /admin/experts/:id/review    → approve or reject documents
GET    /admin/assessment-questions  → list questions
POST   /admin/assessment-questions  → create question
PATCH  /admin/assessment-questions/:id → edit question
DELETE /admin/assessment-questions/:id → delete question

## Tech Stack

- Node.js (LTS)
- Express.js
- MongoDB Atlas + Mongoose
- JWT Authentication
- Winston Logging
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account
- Cloud storage account (AWS S3 or Cloudinary)
- FastAPI AI service running

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yusufuabichi/nomaapp-backend.git
   cd nomaapp-backend
   ```

Install dependencies:

npm install

2. Create environment file:

   cp .env.example .env

3. Configure environment variables in .env

4. Start the server:

# Development

npm run dev

# Production

npm start

5. API Endpoints
   Authentication
   ● POST /api/auth/register - Register new user D
   ● POST /api/auth/login - Login user D
   ● POST /api/auth/change-password - Change password
   ● GET /api/auth/me - Get current user
   Users
   ● GET /api/users/profile - Get profile D
   ● PUT /api/users/profile - Update profile D
   ● DELETE /api/users/account - Deactivate account
   Farms
   ● POST /api/farms - Create farm
   ● GET /api/farms - Get all farms
   ● GET /api/farms/:id - Get farm by ID
   ● PUT /api/farms/:id - Update farm
   ● DELETE /api/farms/:id - Delete farm
   Scans
   ● POST /api/scans - Create scan with image
   ● GET /api/scans - Get all scans
   ● GET /api/scans/stats - Get scan statistics
   ● GET /api/scans/:id - Get scan by ID
   ● POST /api/scans/:id/retry - Retry failed diagnosis
   ● DELETE /api/scans/:id - Delete scan
   Sync (Offline Support)
   ● POST /api/sync/push - Push offline changes
   ● GET /api/sync/pull - Pull changes since last sync
   Admin
   ● GET /api/admin/dashboard - System statistics
   ● PUT /api/admin/users/:id/role - Update user role
   ● PUT /api/admin/users/:id/toggle-status - Toggle user status
   ● GET /api/admin/scans/failed - Get failed scans
   ● POST /api/admin/scans/:id/retry - Admin retry diagnosis
   Deployment
   Render

1. Create new Web Service
1. Connect GitHub repository
1. Set environment variables
1. Deploy
   Cloud Run

# Build container

gcloud builds submit --tag gcr.io/PROJECT_ID/nomaapp-backend

# Deploy

gcloud run deploy nomaapp-backend \
 --image gcr.io/PROJECT_ID/nomaapp-backend \
 --platform managed \
 --region us-central1 \
 --allow-unauthenticated

License
ISC

---

This completes the production-ready NomaApp backend implementation. The codebase follows:

1. **Clean architecture** with strict separation of concerns (controllers, services, models, routes)
2. **Robust error handling** with centralized middleware and consistent response formats
3. **Proper validation** using express-validator
4. **Secure authentication** with JWT and role-based access control
5. **Scalable design** ready for horizontal scaling
6. **Offline-first support** with WatermelonDB-compatible sync endpoints
7. **Cloud storage abstraction** supporting both S3 and Cloudinary
8. **Comprehensive logging** with Winston
9. **AI service integration** with proper error handling and retry logic

Would you like me to elaborate on any specific part of the implementation or provide additional files like Docker configuration or testing setup?
