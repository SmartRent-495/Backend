# SmartRent Backend

Express.js REST API server for the SmartRent property management platform. Handles authentication, payments, property management, and integrates with Firebase and Stripe.

## Prerequisites

- Node.js v18 or higher
- npm
- SQLite3 (for local development)
- Firebase project (for production)
- Stripe account (for payments)

## Quick Start

1. **Install dependencies**
```powershell
npm install
```

2. **Configure environment**

Create `.env` file in the project root:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your_secure_random_jwt_secret_here

# Stripe Payment Integration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Database (Development)
DATABASE_PATH=./smartrent.db

# Firebase Configuration (Production)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id

# API Configuration
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

**Important Notes**:
- `FIREBASE_PRIVATE_KEY` must include literal `\n` characters for newlines when stored as environment variable
- Alternatively, place `firebase-service-account.json` in the project root and configure `src/config/firebase.js` to load from file
- Never commit `.env` or service account JSON files to version control

3. **Run database migrations** (if using SQLite locally)
```powershell
npm run migrate
```

4. **Start development server**
```powershell
npm run dev
```

Server will run on http://localhost:5000

## Project Structure

```
Backend/
├── src/
│   ├── routes/                 # API route handlers
│   │   ├── auth.js             # User authentication and registration
│   │   ├── properties.js       # Property CRUD operations
│   │   ├── leases.js           # Lease management
│   │   ├── payments.js         # Payment processing and Stripe webhooks
│   │   ├── maintenance.js      # Maintenance request handling
│   │   ├── notifications.js    # Push notification management
│   │   └── landlords.js        # Landlord-specific operations
│   ├── services/               # Business logic layer
│   │   ├── firestore.service.js
│   │   ├── properties.service.js
│   │   ├── leases.service.js
│   │   └── users.service.js
│   ├── middleware/             # Express middleware
│   │   └── auth.js             # JWT authentication middleware
│   ├── config/                 # Configuration modules
│   │   ├── database.js         # Database connection setup
│   │   ├── firebase.js         # Firebase Admin SDK initialization
│   │   └── config.js           # General configuration
│   ├── app.js                  # Express app configuration
│   └── server.js               # Server entry point
├── migrations/                 # Database migration scripts
├── firebase-service-account.json  # Firebase credentials (not committed)
├── .env                        # Environment variables (not committed)
└── package.json                # Dependencies and scripts
```

## API Documentation

Detailed API documentation is available in:
- `API_DOCUMENTATION.md` - Complete endpoint reference
- `API_RESPONSE_REFERENCE.md` - Response format examples

### API Testing

Run the test script to verify all endpoints:
```powershell
node test-api.js
```

Or test individual endpoints:
```powershell
node check-properties.js
node test-firestore.js
```

## Available Scripts

```powershell
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm run migrate      # Run database migrations
npm test             # Run test suite
```

## Key API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Properties
- `GET /api/properties` - List properties (filtered by user role)
- `GET /api/properties/:id` - Get property details
- `POST /api/properties` - Create property (landlord only)
- `PUT /api/properties/:id` - Update property (landlord only)
- `DELETE /api/properties/:id` - Delete property (landlord only)

### Leases
- `GET /api/leases` - List leases
- `GET /api/leases/:id` - Get lease details
- `POST /api/leases` - Create lease (landlord only)
- `PUT /api/leases/:id` - Update lease (landlord only)

### Payments
- `GET /api/payments` - List payments
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/create-checkout-session` - Create Stripe checkout session
- `POST /api/payments/webhook` - Stripe webhook handler

### Maintenance
- `GET /api/maintenance` - List maintenance requests
- `POST /api/maintenance` - Create maintenance request (tenant)
- `PUT /api/maintenance/:id` - Update request status (landlord)

## Database Setup

### Local Development (SQLite)
```powershell
# Run migrations to create tables
npm run migrate
```

### Production (Firestore)
1. Create Firebase project at https://console.firebase.google.com
2. Enable Firestore database
3. Download service account JSON from Project Settings > Service Accounts
4. Place JSON file in project root or configure environment variables
5. Update `src/config/firebase.js` if needed

## Stripe Webhook Testing

For local webhook testing:

1. **Install Stripe CLI**
```powershell
# Download from https://stripe.com/docs/stripe-cli
stripe login
```

2. **Forward webhooks to local server**
```powershell
stripe listen --forward-to localhost:5000/api/payments/webhook
```

3. **Copy webhook signing secret** to `.env` as `STRIPE_WEBHOOK_SECRET`

Alternatively, use ngrok:
```powershell
ngrok http 5000
# Use the ngrok URL in Stripe Dashboard webhook configuration
```

## Security Features

- JWT-based authentication with bcrypt password hashing
- Role-based access control (landlord vs tenant)
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers
- Input validation and sanitization
- SQL injection protection

## Deployment

### Render
1. Create new Web Service on Render
2. Connect GitHub repository
3. Configure environment variables in Render dashboard
4. Deploy from `main` branch

### Environment Variables for Production
Set all variables from `.env` example above in your hosting platform's environment configuration.

## Troubleshooting

**Firebase key format error**: Ensure `FIREBASE_PRIVATE_KEY` includes `\n` newline characters. If using a JSON file, verify the path is correct in `src/config/firebase.js`.

**Database connection failed**: For SQLite, verify `DATABASE_PATH` points to a writable location. For Firestore, check Firebase credentials.

**Stripe webhook signature verification failed**: Confirm `STRIPE_WEBHOOK_SECRET` matches the value from Stripe CLI or dashboard.

**CORS errors**: Verify `FRONTEND_URL` in `.env` matches your frontend origin and is included in CORS configuration.

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Run tests: `npm test`
4. Commit: `git commit -m "Description"`
5. Push and create pull request

## License

MIT License

### Tenant
- Register and manage personal profile
- View assigned properties
- Pay rent and utilities online
- Submit maintenance requests
- View payment history
- Receive notifications

### Landlord
- Register and manage business profile
- Add and manage properties
- Add and manage tenants
- Set rent amounts and due dates
- Track payments
- Manage maintenance requests
- View financial reports

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Rate limiting on API endpoints
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection protection

## 💳 Payment Integration

- Stripe integration for secure payments
- Support for rent and utility payments
- Automated payment confirmations
- Payment history tracking
- Refund processing
- Webhook handling for payment events

## 🔔 Notification System

- Payment reminders (3 days before due date)
- Payment confirmations
- Maintenance request updates
- Lease expiration alerts
- System announcements

## 🧪 Testing

# Run backend tests
cd backend
npm test
```


### Firebase (Production Database)
1. Set up Firebase project
2. Configure Firestore database
3. Deploy Cloud Functions
4. Update environment variables

## 🗄️ Database Schema

### Main Tables
- **users** - User accounts (landlords and tenants)
- **properties** - Property listings
- **leases** - Rental agreements
- **payments** - Rent and utility payments
- **maintenance_requests** - Maintenance tickets
- **notifications** - User notifications

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📖 Course Details

- **Course**: CNG 495 - Cloud Computing
- **Semester**: Fall 2025
- **Institution**: METU NCC

## 🙏 Acknowledgments

- Firebase Documentation
- Stripe API Documentation
- Next.js Documentation
- Material-UI Component Library
- Vercel Deployment Platform

## 📚 References

1. [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
2. [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
3. [Firebase Authentication](https://firebase.google.com/docs/auth)
4. [Vercel Documentation](https://vercel.com/docs)
5. [Render Cloud Hosting](https://render.com/docs)
6. [Stripe API Reference](https://stripe.com/docs/api)
```
---

## Contact Details
| Name | Email | 
|------|-------|
| Zeeshan Imran | eng.zeeshanimran@gmail.com | 
| Miguel Mbabazi | miguelmbabatunga31@gmail.com | 
| Mahlet Bekele | mahlet.bizwoin@gmail.com |

**Built by Team SmartRent**
