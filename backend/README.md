# CSSU Rewards - Backend

RESTful API backend for the CSSU Rewards loyalty program management system.

## Tech Stack

- **Express 5** - Web framework
- **Prisma ORM** - Database toolkit
- **SQLite / PostgreSQL** - Database (supports both)
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Zod** - Request validation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database (auto-detects SQLite or PostgreSQL from DATABASE_URL)
npm run setup-db

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Database Setup

The backend supports both **SQLite** (for development) and **PostgreSQL** (for production).

#### SQLite (Development)

```bash
# In .env file:
DATABASE_URL=file:./dev.db
```

#### PostgreSQL (Production)

```bash
# In .env file:
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?schema=public

# With SSL (recommended for production):
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public&sslmode=require
```

#### Database Commands

```bash
# Auto-detect database and generate Prisma client
npm run setup-db

# Run migrations
npm run db:migrate

# Push schema changes (without migrations)
npm run db:push

# Regenerate Prisma client
npm run db:generate

# Seed the database with sample data
npm run seed

# Create a superuser account
npm run createsuperuser
```

### Running the Server

```bash
# Start the server
node index.js
```

The API will be available at `http://localhost:3000`.

## Available Scripts

### `npm run setup-db`

Detects the database type from `DATABASE_URL` and generates the appropriate Prisma client.

### `npm run db:migrate`

Runs Prisma migrations.

### `npm run db:push`

Pushes schema changes to the database without creating a migration.

### `npm run db:generate`

Regenerates the Prisma client.

### `npm run seed`

Seeds the database with sample data for development.

### `npm run createsuperuser`

Interactive script to create a superuser account.

### `npm run clean`

Removes database, migrations, and node_modules for a fresh start.

## Project Structure

```text
backend/
├── index.js              # Express app entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Database migrations
│   ├── seed.js           # Database seeding script
│   └── createsu.js       # Superuser creation script
├── scripts/
│   └── setup-db.js       # Database setup script
├── Dockerfile            # Docker configuration
└── package.json
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| POST | `/auth/reset-password` | Password reset request |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users (manager+) |
| GET | `/users/:id` | Get user details |
| POST | `/users` | Create new user (cashier+) |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user (superuser) |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List transactions |
| GET | `/transactions/:id` | Get transaction details |
| POST | `/transactions` | Create transaction |
| PATCH | `/transactions/:id` | Update transaction |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | List events |
| GET | `/events/:id` | Get event details |
| POST | `/events` | Create event (manager+) |
| PATCH | `/events/:id` | Update event |
| DELETE | `/events/:id` | Delete event |
| POST | `/events/:id/rsvp` | RSVP to event |
| POST | `/events/:id/award` | Award points to attendees |

### Promotions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/promotions` | List promotions |
| GET | `/promotions/:id` | Get promotion details |
| POST | `/promotions` | Create promotion (manager+) |
| PATCH | `/promotions/:id` | Update promotion |
| DELETE | `/promotions/:id` | Delete promotion |

## Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=3000
```

## Database Schema

The application uses Prisma ORM with the following main models:

- **User** - User accounts with roles
- **Transaction** - Point transactions (purchase, redemption, transfer, adjustment)
- **Event** - Events with RSVP tracking
- **Promotion** - Promotional campaigns

See `prisma/schema.prisma` for the complete schema definition.

## Docker

Build and run with Docker:

```bash
docker build -t cssu-rewards-backend .
docker run -p 3000:3000 cssu-rewards-backend
```

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
