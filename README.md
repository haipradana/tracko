# Retail Behavior Analysis - Frontend

Frontend for Tracko.tech retail analytics platform, built with Vite, TypeScript, and Tailwind CSS.

## Features

- **Real-time Video Analysis** interface
- **Interactive Analytics Dashboard**:
  - Customer heatmaps visualization
  - Dwell time analysis charts
  - Behavior pattern insights
  - Action classification results
- **Multi-file Upload** with drag & drop support
- **Responsive Design** with Tailwind CSS
- **Real-time Processing** status and progress tracking
- **Export Capabilities** (CSV, JSON, images)
- **Batch Analysis** for multiple videos

## Technology Stack

- **React**
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (see `../fastapi-app`)

## Installation

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Environment Setup

Create `.env` file (optional):

```env
VITE_FASTAPI_URL=http://localhost:8000
```

### 3. Development Server

```bash
# Start development server
npm run dev

# Server will be available at:
# http://localhost:5173
```

### 4. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload

# Production
npm run build        # Build for production
npm run preview      # Preview production build locally

```

## 🔗 API Integration

### Backend Connection

The frontend connects to the FastAPI backend:

```typescript
// Default API configuration
const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || "https://api.tracko.tech";

// Main endpoints
POST /analyze        # Single video analysis
POST /analyze-batch  # Multiple video analysis
POST /apply-filters  # Apply filters to results
GET  /health         # Health check
```

### Data Flow

1. **Upload**: User uploads video files via drag & drop
2. **Configure**: Set analysis parameters (duration, speed mode)
3. **Process**: Send to backend API for AI analysis
4. **Visualize**: Display results in interactive dashboard
5. **Export**: Download results in various formats

## Usage Guide

### 1. Video Upload

- Drag & drop video files or click "Browse Files"
- Supports: MP4, AVI, MOV, WebM formats
- Multi-file upload for batch analysis
- Real-time file size and duration detection

### 2. Analysis Configuration

- **Duration**: Set max analysis duration (10-300 seconds)
- **Speed Mode**: 
  - High Quality (0.5x speed, best accuracy)
  - Balanced (1.0x speed, default)
  - Fast (2.0x speed, quick results)

### 3. Results Dashboard

- **Heatmap**: Customer movement patterns
- **Charts**: Dwell time and behavior analytics
- **Video**: Annotated video with AI detections
- **Insights**: AI-powered business recommendations
- **Export**: Download CSV, JSON, images

## Deployment

### Netlify (Recommended)

```bash
# Build and deploy
npm run build

# Deploy dist/ folder to Netlify
# _redirects file included for SPA routing
```

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"]
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Backend Connection Error
```bash
# Check backend URL in .env
echo $VITE_FASTAPI_URL

# Test backend health
curl http://localhost:8000/health
```

#### 2. Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
npm run dev -- --force
```

**Full Stack Setup:**
```bash
# Terminal 1: Start backend
cd ../fastapi-app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start frontend
cd web
npm run dev
```

