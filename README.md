# Project Assembler

A full-stack project management application with a React frontend and Express.js backend, featuring Firebase Authentication, Firestore database, project CRUD operations, and file management.

## Features

- **User Authentication**: Register, login with Email/Password or Google OAuth via Firebase Authentication
- **Project Management**: Create, read, update, delete projects
- **File Management**: Add, edit, delete files within projects
- **Cloud Storage**: All data stored in Firebase Firestore
- **Real-time Updates**: Changes are immediately saved to Firestore
- **User Isolation**: Each user can only access their own projects and files
- **Bilingual UI**: English and Arabic language support

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication (Admin SDK)
- **Validation**: Zod
- **Logging**: Pino

### Frontend
- **Framework**: React with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React hooks
- **Authentication**: Firebase Client SDK

## Prerequisites

- Node.js 18+
- pnpm package manager
- Firebase project with Authentication and Firestore enabled

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/buytuk20/book.git
   cd project-assembler
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Firebase**

   a. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   
   b. Enable Authentication (Email/Password and Google providers)
   
   c. Enable Firestore Database
   
   d. Download the service account JSON file:
      - Go to Project Settings → Service Accounts
      - Click "Generate new private key"
      - Save the JSON file as `firebase-service-account.json` in `artifacts/api-server/`

4. **Set up environment variables**
   
   Backend (`artifacts/api-server/.env`):
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
   ```
   
   Frontend (`artifacts/project-assembler/.env`):
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

   You can find these values in your Firebase project settings under "General".

## Running the Application

### Start the Backend API Server

```bash
cd artifacts/api-server
pnpm run dev
```

The API server will start on `http://localhost:3000`

### Start the Frontend Development Server

In a new terminal:

```bash
cd artifacts/project-assembler
pnpm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user (requires Firebase ID token)
- `POST /api/auth/login` - Login user (requires Firebase ID token)
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all projects for authenticated user
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get a specific project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Files
- `GET /api/files/project/:projectId` - Get all files for a project
- `POST /api/files/project/:projectId` - Create a new file
- `POST /api/files/project/:projectId/bulk` - Bulk create/update files
- `GET /api/files/:id` - Get a specific file
- `PUT /api/files/:id` - Update a file
- `DELETE /api/files/:id` - Delete a file

### Health Check
- `GET /api/healthz` - Health check endpoint

## Firestore Schema

### Users Collection
- `id` (string, document ID - Firebase UID)
- `email` (string)
- `username` (string)
- `createdAt` (number, timestamp)
- `updatedAt` (number, timestamp)

### Projects Collection
- `id` (string, document ID)
- `userId` (string, references user.id)
- `name` (string)
- `tree` (string)
- `createdAt` (number, timestamp)
- `updatedAt` (number, timestamp)

### Files Collection
- `id` (string, document ID)
- `projectId` (string, references project.id)
- `path` (string)
- `content` (string)
- `updatedAt` (number, timestamp)

## Development

### Building the Backend

```bash
cd artifacts/api-server
pnpm run build
```

### Running Tests

```bash
cd artifacts/api-server
pnpm test
```

### Type Checking

```bash
cd artifacts/api-server
pnpm run typecheck
```

## Project Structure

```
project-assembler/
├── artifacts/
│   ├── api-server/          # Backend Express.js server
│   │   ├── src/
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── middlewares/ # Authentication middleware
│   │   │   ├── lib/         # Utilities (firebase, auth, logger)
│   │   │   ├── types/       # TypeScript types (Firestore schemas)
│   │   │   ├── tests/       # Backend tests
│   │   │   ├── app.ts       # Express app configuration
│   │   │   └── index.ts     # Entry point
│   │   ├── firebase-service-account.json # Firebase service account
│   │   └── package.json
│   └── project-assembler/   # Frontend React app
│       ├── src/
│       │   ├── components/  # React components (AuthModal)
│       │   ├── lib/         # API client & Firebase config
│       │   ├── App.tsx      # Original local storage version
│       │   ├── AppWithApi.tsx # API-connected version with Firebase
│       │   └── main.tsx
│       └── package.json
├── lib/
│   ├── api-spec/            # OpenAPI specification
│   │   └── openapi.yaml
│   └── api-client-react/    # Generated API client
├── .env.example             # Environment variables template
├── pnpm-workspace.yaml      # Workspace configuration
└── package.json             # Root package.json
```

## Security Features

- Firebase Authentication with secure ID token verification
- Firebase Firestore security rules for data isolation
- User isolation - users can only access their own data
- CORS configuration
- Input validation with Zod
- Path traversal prevention
- Secure Firebase Admin SDK with service account

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a production Firebase project
3. Configure proper CORS origin
4. Use HTTPS
5. Configure proper logging levels
6. Set up Firestore indexes for optimal query performance
7. Configure Firebase security rules for production

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
