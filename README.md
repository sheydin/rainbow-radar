# Rainbow Radar 🌈

An interactive web application that displays real-time rainbow probability predictions on a grayscale map using meteorological data and solar geometry.

## Features

- **Interactive Map**: Full-screen Leaflet map with grayscale OpenStreetMap tiles
- **Rainbow Heatmap**: Color-coded probability overlay (blue → green → yellow → red)
- **Geolocation**: Auto-centers on user location with city-scale zoom
- **Place Search**: Search any location using Nominatim geocoding
- **Solar Physics**: Accurate sun position and rainbow geometry calculations
- **Weather Integration**: Real-time data from OpenWeatherMap One Call 3.0 API
- **Time Forecast**: Toggle between Now/+1h/+2h predictions
- **Responsive Design**: Clean UI with legend and status indicators

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Mapping**: Leaflet + leaflet.heat for heatmap visualization
- **Styling**: CSS Modules
- **APIs**: OpenWeatherMap, Nominatim (OpenStreetMap)

## Physics Implementation

Rainbow probability calculation based on:
- Solar elevation and azimuth angles (NOAA algorithms)
- Antisolar point geometry and 42° rainbow scattering angle
- Weather conditions: rain intensity, cloud coverage, visibility
- Bearing alignment between user→cell direction and antisolar azimuth

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Optional: Create `.env` file with your OpenWeatherMap API key:
```
VITE_OWM_API_KEY=your_api_key_here
```
(Falls back to included demo key if not provided)

## How It Works

1. **Location Detection**: Requests user geolocation permission
2. **Weather Fetch**: Retrieves current and hourly weather data
3. **Grid Generation**: Creates a 25km radius sampling grid around user
4. **Probability Calculation**: Computes rainbow likelihood for each grid cell using meteorological and solar data
5. **Visualization**: Renders color-coded heatmap overlay on the map

## License

MIT License - see LICENSE file for details.
