# SmartRent - Property Management & Rental Platform

A cloud-based property management system that unifies landlords and tenants under one integrated platform.

## 🏢 Project Overview

SmartRent is a comprehensive web-based property and rental management system built for CNG 495 - Cloud Computing (Fall 2025). The platform streamlines rental property management by providing secure, efficient tools for both landlords and tenants.

## 👥 Team Members

- **Mahlet Bekele** - 2643146 (Frontend Development)
- **Zeeshan Imran** - 2640779 (API Development & Integration)
- **Miguel Tunga Mbabazi** - 2600195 (Database Setup & Management)

## ✨ Features

### For Tenants
- 🔐 Secure login and authentication
- 💳 Online rent and utility payments
- 🏠 View property details and lease information
- 🔧 Submit and track maintenance requests
- 🔔 Payment reminders and notifications
- 📊 Payment history tracking

### For Landlords
- 🏘️ Manage multiple properties
- 👥 Tenant management and lease tracking
- 💰 Track rent payments in real-time
- 🛠️ View and update maintenance requests
- 📈 Financial reporting and analytics
- 🔔 Automated rent reminders
- 📧 Tenant communication tools

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: 
  - **Development**: SQLite3 (local file-based)
  - **Production**: Firebase Firestore (cloud NoSQL)
- **Authentication**: JWT with bcryptjs
- **Payment Processing**: Stripe API
- **File Upload**: Multer
- **Security**: Helmet.js, CORS, Rate Limiting

### Cloud Services (Production)
- **Platform**: Firebase
  - Firestore (NoSQL Database)
  - Cloud Functions (Serverless backend)
  - Cloud Messaging (Push Notifications)
  - Cloud Storage (File storage)
  - Authentication (Optional)
  - Hosting (Optional)

- **Payment Gateway**: Stripe / Paddle

## 📁 Project Structure

```
SmartRent/
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   │   ├── auth/      # Authentication pages
│   │   │   ├── dashboard/ # Main dashboard
│   │   │   ├── properties/# Property management
│   │   │   ├── tenants/   # Tenant management
│   │   │   ├── payments/  # Payment processing
│   │   │   └── maintenance/ # Maintenance requests
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities and helpers
│   │   └── types/         # TypeScript definitions
│   └── package.json
│
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   │   ├── auth.js   # Authentication
│   │   │   ├── properties.js
│   │   │   ├── tenants.js
│   │   │   ├── payments.js
│   │   │   └── maintenance.js
│   │   ├── middleware/   # Custom middleware
│   │   ├── config/       # Configuration files
│   │   └── app.js        # Express application
│   ├── migrations/       # Database migrations
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- SQLite3 (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smartrent.git
   cd smartrent
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install


3. **Configure Environment Variables**

   Backend (.env):
   ```env
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   DATABASE_PATH=./smartrent.db

   FIREBASE_PROJECT_ID= your_firebase_project_ID
   FIREBASE_STORAGE_BUCKET= your_firebase_storage_bucket
   ```



4. **Run Database Migrations**
   ```bash
   cd backend
   npm run migrate
   ```

5. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on http://localhost:5000


## 📱 User Roles

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
- **Institution**: [Your University Name]

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

---

**Built with ❤️ by Team SmartRent**
