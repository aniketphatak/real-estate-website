# PropertyInsight - Real Estate Property Intelligence Platform

A comprehensive real estate property lookup platform similar to Homebot.ai. Enter any US property address to get detailed property information including valuations, mortgage data, ownership details, liens, tax information, and more.

## Features

- **Property Valuation**: Get accurate property value estimates from multiple sources including Zillow Zestimates, ATTOM Data, and county assessments
- **Mortgage & Liens**: View current mortgage information, outstanding loans, and any liens recorded against the property
- **Owner Information**: Access property owner details, ownership history, and mailing addresses from public records
- **NMLS Integration**: Verify lender information through NMLS (Nationwide Multistate Licensing System)
- **Tax Information**: View assessed values, annual taxes, and exemptions
- **Sales History**: Track historical sales and price changes
- **Data Aggregation**: Combines data from multiple trusted sources for comprehensive reports

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Lucide React for icons
- Axios for API calls

### Backend
- Node.js with Express
- Multiple data provider integrations
- In-memory caching (production should use Redis)
- Rate limiting and security middleware

## Data Sources

The platform aggregates data from:
- **ATTOM Data** - Comprehensive property data, mortgage info, ownership details
- **Zillow API** (via RapidAPI) - Property valuations and Zestimates
- **County Records** - Tax assessments, liens, recorded documents
- **NMLS Consumer Access** - Lender and mortgage broker verification

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd real-estate-website
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Configure environment variables:
```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your API keys:
- `RAPIDAPI_KEY` - Get from [RapidAPI](https://rapidapi.com/apimaker/api/zillow-com1)
- `ATTOM_API_KEY` - Get from [ATTOM Data](https://api.attomdata.com/)
- `COUNTY_RECORDS_API_KEY` - From your county records provider
- `NMLS_API_KEY` - For NMLS integration

> **Note**: The application includes mock data for development/demo purposes when API keys are not configured.

### Running the Application

Development mode (runs both frontend and backend):
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## API Endpoints

### Property Search
- `GET /api/property/search` - Search for property by address
- `GET /api/property/report` - Get comprehensive property report
- `GET /api/property/valuation` - Get property valuation estimates
- `GET /api/property/mortgage` - Get mortgage and lien information
- `GET /api/property/owner` - Get owner information
- `GET /api/property/autocomplete` - Address autocomplete suggestions

### Query Parameters
All endpoints accept:
- `address` - Street address (e.g., "123 Main St")
- `city` - City name
- `state` - 2-letter state code (e.g., "CA")
- `zip` - 5-digit ZIP code

## Project Structure

```
real-estate-website/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   │   └── providers/   # Data provider integrations
│   │   ├── middleware/      # Express middleware
│   │   └── index.js         # Server entry point
│   ├── .env.example         # Environment template
│   └── package.json
├── package.json             # Root package.json
└── README.md
```

## Production Deployment

For production deployment:

1. Build the frontend:
```bash
npm run build
```

2. Set `NODE_ENV=production` in server environment

3. Consider using:
   - Redis for caching instead of in-memory cache
   - PM2 or similar for process management
   - Nginx as reverse proxy
   - SSL/TLS certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Disclaimer

This application uses publicly available data sources. Always verify information through official channels. Property data accuracy depends on the underlying data providers and may not reflect the most current information.
