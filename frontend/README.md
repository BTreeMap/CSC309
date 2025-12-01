# CSSU Rewards - Frontend

A modern React.js frontend for the CSSU Rewards loyalty program management system.

## Tech Stack

- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **Axios** - HTTP client
- **Vitest** - Testing framework
- **QRCode.react** - QR code generation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at [http://localhost:5173](http://localhost:5173).

## Available Scripts

### `npm start`

Runs the app in development mode with hot module replacement (HMR).

### `npm run build`

Builds the app for production to the `build` folder. The build is minified and optimized for best performance.

### `npm run preview`

Locally preview the production build.

### `npm test`

Launches the test runner using Vitest.

### `npm run test:coverage`

Runs tests with coverage reporting.

## Project Structure

```text
src/
├── api/              # API client and endpoint modules
├── components/       # Reusable UI components
│   └── shared/       # Common shared components
├── contexts/         # React context providers
├── pages/            # Page components (routes)
└── utils/            # Utility functions and helpers
```

## Features

### User Roles

The application supports multiple user roles with role-based access control:

- **Regular User** - View points, transactions, events; redeem promotions; transfer points
- **Cashier** - Create transactions; process redemption requests
- **Manager** - Manage users, events, promotions, and transactions
- **Event Organizer** - Manage assigned events and attendees
- **Superuser** - Full system access including role promotions

### Key Features

- 📊 **Dashboard** - Role-specific landing pages with quick actions
- 💳 **Transactions** - Purchase, redemption, transfer, and adjustment support
- 🎟️ **Events** - Event management with RSVP and attendance tracking
- 🎁 **Promotions** - Create and manage promotional campaigns
- 📱 **QR Codes** - User identification and redemption request QR codes
- 👥 **User Management** - Account management with role assignment

## Configuration

The app connects to the backend API. Configure the API URL in `src/api/client.js`.

## Learn More

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [React Router Documentation](https://reactrouter.com/)
