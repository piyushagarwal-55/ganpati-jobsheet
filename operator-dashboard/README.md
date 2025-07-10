# Ganpati Overseas - Operator Dashboard

A real-time operator dashboard for machine job management with automated email notifications.

## Features

- 🔄 **Real-time Updates**: Live job status updates and notifications
- 📧 **Email Notifications**: Automated emails to specific departments
  - `finance@ganpathioverseas.com` - Balance updates
  - `stock@ganpathioverseas.com` - Stock level changes
  - `portal@ganpathioverseas.com` - Job status updates
- 🎯 **Machine-specific**: Each operator sees only their machine's jobs
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Real-time Subscriptions**: Instant updates via Supabase realtime

## Email Notification System

The system automatically sends emails for:

1. **Balance Updates** → `finance@ganpathioverseas.com`
   - When party balances are modified
   - Includes transaction details and amount changes

2. **Stock Updates** → `stock@ganpathioverseas.com`
   - When inventory levels change
   - Low stock alerts when quantities drop below 100 units

3. **Job Updates** → `portal@ganpathioverseas.com`
   - Job status changes (assigned, in progress, completed, cancelled)
   - Job assignments to machines
   - Job completion notifications

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the `operator-dashboard` directory:

```env
# Supabase Configuration (Same as main project)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration for Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com

# Email Worker Security
CRON_SECRET=your_secure_cron_secret_here
EMAIL_WORKER_TOKEN=your_email_worker_token_here

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-operator-dashboard-domain.vercel.app
```

### 2. Database Setup

Run the database triggers and setup:

```sql
-- Execute the triggers.sql file in your Supabase SQL editor
-- This file is located in: operator-dashboard/database/triggers.sql
```

The triggers will:

- Create notification tables
- Set up email queue system
- Add automatic email triggers for balance, stock, and job updates
- Enable real-time subscriptions

### 3. Install Dependencies

```bash
cd operator-dashboard
npm install
```

### 4. Development

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

### 5. Email Setup (Gmail Example)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → App passwords
   - Generate password for "Mail"
3. **Use App Password** as `SMTP_PASS` in environment variables

## Deployment on Vercel

### Option 1: Deploy from Root Directory

1. **Connect Repository** to Vercel
2. **Set Root Directory** to `operator-dashboard`
3. **Configure Environment Variables** in Vercel dashboard
4. **Deploy**

### Option 2: Deploy as Separate Repository

1. **Copy operator-dashboard folder** to new repository
2. **Connect new repository** to Vercel
3. **Configure environment variables**
4. **Deploy**

### Vercel Configuration

In your Vercel project settings:

1. **Root Directory**: `operator-dashboard` (if deploying from main repo)
2. **Framework Preset**: Next.js
3. **Node.js Version**: 18.x
4. **Environment Variables**: Add all variables from `.env.local`

### Email Worker Cron Job

Set up a cron job to process email queue:

1. **Vercel Cron** (Recommended):

   ```json
   // vercel.json
   {
     "crons": [
       {
         "path": "/api/email-worker",
         "schedule": "*/5 * * * *"
       }
     ]
   }
   ```

2. **External Cron Service**:
   - Use services like cron-job.org
   - Schedule POST requests to: `https://your-domain.vercel.app/api/email-worker`
   - Add header: `Authorization: Bearer your_cron_secret`

## URL Parameters

You can direct operators to specific machines:

```
https://your-operator-dashboard.vercel.app/?machine_id=1
```

This will automatically select the machine when the dashboard loads.

## Database Triggers

The system includes automatic database triggers:

### Job Status Trigger

- Fires when job status changes or jobs are assigned to machines
- Sends notification to `portal@ganpathioverseas.com`
- Creates operator notification for dashboard

### Balance Update Trigger

- Fires when party balances change
- Sends notification to `finance@ganpathioverseas.com`
- Includes balance change details

### Stock Update Trigger

- Fires when inventory quantities change
- Sends notification to `stock@ganpathioverseas.com`
- Includes low stock alerts

## API Endpoints

### Jobs API

- `GET /api/jobs?machine_id=1` - Get jobs for machine
- `PUT /api/jobs?job_id=1` - Update job status

### Notifications API

- `GET /api/notifications?machine_id=1` - Get notifications
- `PUT /api/notifications?notification_id=1` - Mark as read
- `PATCH /api/notifications?machine_id=1` - Mark all as read

### Email Worker API

- `POST /api/email-worker` - Process email queue (cron job)
- `GET /api/email-worker?token=xyz` - Manual trigger (testing)

## Real-time Features

The dashboard uses Supabase real-time subscriptions for:

1. **Job Updates**: Live job status changes
2. **Notifications**: Instant notification delivery
3. **Machine Status**: Real-time machine availability

## Security Features

- **Environment-based email routing**
- **Secure API endpoints with validation**
- **Input sanitization and validation**
- **CORS protection**
- **Rate limiting friendly**

## Monitoring

Monitor the system through:

1. **Supabase Dashboard**: Database activity and real-time connections
2. **Vercel Analytics**: Performance and usage metrics
3. **Email Queue Table**: Failed/pending email notifications
4. **Browser Console**: Real-time connection status

## Troubleshooting

### Email Not Sending

1. Check SMTP credentials in environment variables
2. Verify email queue table has pending items
3. Check cron job is running every 5 minutes
4. Verify database triggers are active

### Real-time Not Working

1. Check Supabase real-time is enabled
2. Verify browser WebSocket connection
3. Check network connectivity
4. Refresh the dashboard

### Jobs Not Loading

1. Verify machine_id exists in database
2. Check Supabase connection
3. Verify API endpoint accessibility
4. Check browser console for errors

## Support

For technical support or questions about the operator dashboard:

- Check the main project repository
- Review Supabase logs for database issues
- Monitor Vercel deployment logs
- Test email functionality with manual API calls

## Architecture

```
Main Project (Vercel)
├── Job Management System
├── Database (Supabase)
│   ├── Triggers → Email Queue
│   └── Real-time Subscriptions
└── Operator Dashboard (Separate Vercel Deploy)
    ├── Real-time Dashboard UI
    ├── Email Worker (Cron Job)
    └── Notification System
```

The operator dashboard connects to the same Supabase database as the main project but runs independently, allowing for:

- **Separate domains** for operators vs admin
- **Independent scaling** and deployment
- **Isolated authentication** if needed
- **Dedicated operator experience**
