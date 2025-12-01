# CSSU Rewards

A comprehensive role-based loyalty program management system built for the Computer Science Students Union (CSSU).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)

## Overview

CSSU Rewards is a full-stack web application that enables student organizations to manage a points-based loyalty program. Users can earn points through purchases and events, redeem them for promotions, and transfer points to other members.

### Key Features

- 🎯 **Multi-role System** - Support for Regular Users, Cashiers, Managers, Event Organizers, and Superusers
- 💰 **Points Management** - Earn, redeem, and transfer points with full transaction history
- 🎟️ **Event Management** - Create events, manage RSVPs, and award attendance points
- 🎁 **Promotions** - Create and manage promotional campaigns with point redemption
- 📱 **QR Code Integration** - Quick user identification and redemption processing
- 🔐 **Secure Authentication** - JWT-based authentication with role-based access control
- 📊 **Dashboard** - Role-specific dashboards with quick actions and insights

## Tech Stack

### Frontend

- **React 19** with React Router 7
- **Vite 7** for fast development and building
- **Axios** for API communication
- **QRCode.react** for QR code generation
- **Vitest** for testing

### Backend

- **Express 5** REST API
- **Prisma ORM** with SQLite
- **JWT** for authentication
- **bcrypt** for password hashing
- **Zod** for validation

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CSC309
   ```

2. **Set up the backend**

   ```bash
   cd backend
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration
   
   # Run database migrations
   npx prisma migrate dev
   
   # Seed the database (optional)
   npm run seed
   
   # Create a superuser
   npm run createsuperuser
   ```

3. **Set up the frontend**

   ```bash
   cd frontend
   npm install
   ```

### Running the Application

**Start the backend server:**

```bash
cd backend
node index.js
```

The API will be available at `http://localhost:3000`.

**Start the frontend development server:**

```bash
cd frontend
npm start
```

The app will be available at `http://localhost:5173`.

## Project Structure

```text
CSC309/
├── backend/
│   ├── index.js          # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   ├── seed.js       # Database seeding
│   │   └── createsu.js   # Superuser creation script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/          # API client modules
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   └── utils/        # Utilities
│   ├── index.html
│   └── package.json
└── README.md
```

## User Roles

| Role | Description |
|------|-------------|
| **Regular User** | View points balance, transactions, events; redeem promotions; transfer points |
| **Cashier** | Create purchase transactions; process redemption requests |
| **Manager** | Manage users, events, promotions, and all transactions |
| **Event Organizer** | Manage assigned events, attendees, and award points |
| **Superuser** | Full system access including role management |

Users can hold multiple roles and switch between them using the role switcher.

## API Documentation

The backend provides a RESTful API. Key endpoints include:

- `POST /auth/login` - User authentication
- `GET /users` - User management
- `GET /transactions` - Transaction history
- `GET /events` - Event listings
- `GET /promotions` - Promotion listings

## Development

### Running Tests

**Frontend tests:**

```bash
cd frontend
npm test
```

**With coverage:**

```bash
npm run test:coverage
```

### Building for Production

**Frontend:**

```bash
cd frontend
npm run build
```

The build output will be in the `frontend/build` directory.

## Deployment

The application can be deployed using Docker. A `Dockerfile` is provided in the backend directory.

```bash
cd backend
docker build -t cssu-rewards-backend .
docker run -p 3000:3000 cssu-rewards-backend
```

For the frontend, serve the built files from any static file server or CDN.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note:** Logo and branding assets are NOT covered by the MIT License and remain proprietary. See the LICENSE file for details.

## Authors

- Joe Fang - <csc309@oss.joefang.org>
- Michael Lin - <xiaoshu.lin@mail.utoronto.ca>

## Acknowledgments

- CSC309 Course Staff, University of Toronto
- Computer Science Students Union (CSSU)
