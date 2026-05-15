# FleetBook Backend

Secure, scalable Node.js + TypeScript backend for the FleetBook React Native app.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **ORM**: Prisma (PostgreSQL)
- **Validation**: Zod
- **Auth**: JWT + bcrypt
- **Email**: Nodemailer + Gmail
- **WhatsApp**: Twilio
- **PDF**: PDFKit
- **Scheduler**: node-cron
- **Security**: helmet, cors, express-rate-limit

## Architecture

```
src/
├── modules/
│   ├── auth/          # register, login
│   ├── users/         # CRUD (admin only)
│   ├── vehicles/      # CRUD
│   ├── categories/    # income/expense categories
│   ├── logs/          # km logs, fuel, income, expense
│   └── reports/       # PDF reports, templates, fleet stats
├── services/
│   ├── email/         # Nodemailer + Gmail
│   ├── whatsapp/      # Twilio WhatsApp
│   └── pdf/           # PDFKit report generation
├── shared/
│   ├── middleware/    # auth guard, error handler
│   ├── utils/         # prisma, logger, response, asyncHandler
│   └── types/
├── cron.ts            # Monthly automated report (1st of month, 08:00)
├── app.ts             # Express app
└── server.ts          # Entry point
```

Each module follows: `schema.ts → repo.ts → service.ts → controller.ts → routes.ts`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, TWILIO_*
```

### 3. Gmail App Password

1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate a password for "Mail" and paste it as `GMAIL_APP_PASSWORD`

### 4. Twilio WhatsApp

1. Sign up at twilio.com
2. Use the Twilio Sandbox for WhatsApp (or a production number)
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`

### 5. Database (PostgreSQL)

Use any cloud PostgreSQL: [Supabase](https://supabase.com), [Neon](https://neon.tech), [Railway](https://railway.app)

```bash
npm run db:migrate   # run migrations
npm run db:generate  # generate Prisma client
```

### 6. Run

```bash
npm run dev    # development
npm run build && npm start  # production
```

## API Endpoints

| Method | Path                                                   | Auth  | Description            |
| ------ | ------------------------------------------------------ | ----- | ---------------------- |
| POST   | `/api/auth/register`                                   | -     | Register user          |
| POST   | `/api/auth/login`                                      | -     | Login                  |
| GET    | `/api/users`                                           | Admin | List users             |
| PATCH  | `/api/users/:id`                                       | Admin | Update user            |
| DELETE | `/api/users/:id`                                       | Admin | Delete user            |
| GET    | `/api/vehicles`                                        | Auth  | List vehicles          |
| POST   | `/api/vehicles`                                        | Admin | Create vehicle         |
| GET    | `/api/categories?type=INCOME`                          | Auth  | List categories        |
| POST   | `/api/categories`                                      | Admin | Create category        |
| GET    | `/api/logs`                                            | Auth  | Get km logs            |
| POST   | `/api/logs`                                            | Auth  | Create km log          |
| GET    | `/api/logs/fuel`                                       | Auth  | Get fuel records       |
| POST   | `/api/logs/fuel`                                       | Auth  | Create fuel record     |
| GET    | `/api/logs/income`                                     | Auth  | Get income records     |
| POST   | `/api/logs/income`                                     | Auth  | Create income          |
| GET    | `/api/logs/expense`                                    | Auth  | Get expenses           |
| POST   | `/api/logs/expense`                                    | Auth  | Create expense         |
| GET    | `/api/logs/stats?date=YYYY-MM-DD`                      | Auth  | Daily stats            |
| GET    | `/api/reports/stats`                                   | Admin | Fleet stats            |
| GET    | `/api/reports/generate?startDate=&endDate=&download=1` | Auth  | Generate + send report |
| GET    | `/api/reports/generate/:userId?startDate=&endDate=`    | Admin | Generate for user      |
| GET    | `/api/reports/templates`                               | Auth  | List templates         |
| POST   | `/api/reports/templates`                               | Auth  | Create template        |
| PATCH  | `/api/reports/templates/:id`                           | Auth  | Update template        |
| DELETE | `/api/reports/templates/:id`                           | Auth  | Delete template        |

## WhatsApp Message Template

```
Hello {user_name},

Your monthly profit report for the period {from_date} to {to_date} is ready.

Total Revenue: ₹{total_revenue}
Total Profit: ₹{total_profit}

Please find the report attached.
```

## Automated Monthly Reports

The cron job runs on the **1st of every month at 08:00 AM** and:

1. Fetches all active users
2. Generates a PDF report for the previous month
3. Sends it via email (if user has email)
4. Sends the WhatsApp message (if user has phone)

## Rate Limiting

- Global: 100 requests / 15 minutes
- Auth endpoints: 20 requests / 15 minutes
