# Web Deployment Guide for Serial Pilot

This guide explains how to deploy Serial Pilot as a web application.

## Requirements

### Browser Compatibility
- **Chrome/Edge 89+** or **Opera 75+**
- **HTTPS connection** (required for Web Serial API, except localhost)
- **User gesture** required to access serial ports (security requirement)

### Features Available in Web Version
✅ Web Serial API support  
✅ Multiple port connections  
✅ Test case management  
✅ Real-time data monitoring  
✅ All UI features  

### Limitations in Web Version
❌ No file system access (compared to Tauri desktop version)  
❌ Limited to Web Serial API compatible devices  
❌ Requires user interaction for each port access  

## Build Commands

### Standard Web Build
```bash
npm run build
```

### Web-Optimized Build (excludes Tauri dependencies)
```bash
npm run build:web
```

### Development with Web Mode
```bash
npm run dev
```

## Deployment Steps

1. **Build the application:**
   ```bash
   npm run build:web
   ```

2. **Deploy the `dist` folder** to your web hosting service:
   - Netlify
   - Vercel  
   - GitHub Pages
   - Any static hosting service

3. **Configure HTTPS:** Ensure your deployment uses HTTPS (most hosting services provide this automatically)

## Environment Detection

The application automatically detects the runtime environment:
- **Web Environment**: Uses Web Serial API
- **Tauri Environment**: Uses Tauri's serial plugin (desktop app)
- **Fallback**: Defaults to Web Serial API

## Browser Setup

### Chrome/Edge Setup
1. Ensure you're using Chrome 89+ or Edge 89+
2. Navigate to the deployed app over HTTPS
3. Click "Connect" or "Quick Connect" 
4. Browser will prompt for device selection
5. Select your serial device and grant permission

### Troubleshooting Web Serial API

If Web Serial API doesn't work:

1. **Check browser compatibility**
2. **Verify HTTPS connection** 
3. **Enable experimental features** (if needed):
   - Go to `chrome://flags/#enable-experimental-web-platform-features`
   - Enable the flag and restart browser

## Testing Locally

1. **Development server:**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:8080` (localhost works with Web Serial API)

2. **Production build locally:**
   ```bash
   npm run build:web
   npm run preview
   ```

## Security Notes

- Web Serial API requires user interaction for security
- Each port access needs explicit user permission
- HTTPS is mandatory for production deployments
- Browsers may cache permissions for trusted sites

## Hosting Recommendations

### Recommended Platforms:
- **Netlify** (easiest deployment from Git)
- **Vercel** (great performance)
- **GitHub Pages** (free for public repos)
- **Firebase Hosting** (Google's platform)

### Custom Domain Setup:
Most platforms support custom domains with automatic HTTPS certificates.

## Performance Optimization

The web build automatically:
- Excludes Tauri dependencies for smaller bundle size
- Uses Web Serial API for better browser compatibility
- Optimizes for web-specific use cases