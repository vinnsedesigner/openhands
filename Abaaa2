# Vyzorix Update Server — Repository Structure

```
vyzorix-update-server/
│
├── README.md                              # Server documentation, setup instructions
├── LICENSE                                # Repository license
├── .gitignore                             # Ignore node_modules, logs, env files
├── package.json                           # Express.js dependencies
├── package-lock.json                      # Locked dependency versions
├── server.js                              # Express.js API server
├── Dockerfile                             # Container definition for Render
├── render.yaml                            # Render deployment configuration
├── .env.example                           # Environment variables template
│
├── bin/                                   # APK Binary Storage (populated by CI/CD)
│   ├── audiorouter-v2.0.0.apk             # Initial release APK
│   ├── audiorouter-v2.1.0.apk             # Updated release APK
│   └── audiorouter-v2.2.0.apk             # Future release APK
│
├── api/
│   └── v1/
│       ├── v emailersion.json                   # Current version metadata (updated by CI/CD)
│       └── changelog.json                 # Historical changelog data (updated by CI/CD)
│
├── public/
│   ├── index.html                         # Simple landing page with server status
│   ├── style.css                          # Minimal styling for landing page
│   └── health.json                        # Static health check file (fallback)
│
├── scripts/
│   ├── generate_version.sh                # Helper script to generate version.json
│   ├── compute_checksum.sh                # Helper script to compute SHA-256
│   └── validate_apk.sh                    # Helper script to validate APK before push
│
├── .github/
│   └── workflows/
│       └── deploy.yml                     # Auto-deploy to Render on main branch push
│
└── logs/
    └── .gitkeep                           # Ensures logs directory exists in git
```

---

## File Descriptions

### `package.json`
```json
{
  "name": "vyzorix-update-server",
  "version": "1.0.0",
  "description": "Static update server for VyzorixAudioRouter APK distribution",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "health": "curl http://localhost:3000/health"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### `server.js`
```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow app to fetch
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use(cors({
  origin: ['android-app://com.vyzorix.audiorouter'],
  methods: ['GET', 'HEAD'],
  allowedHeaders: ['Accept', 'X-App-Version', 'X-App-Build', 'X-Device-Model', 'X-Android-Version', 'Range']
}));

// Serve static files
app.use('/bin', express.static(path.join(__dirname, 'bin'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

app.use('/api', express.static(path.join(__dirname, 'api'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Version check endpoint
app.get('/api/v1/version', (req, res) => {
  const versionPath = path.join(__dirname, 'api', 'v1', 'version.json');
  if (fs.existsSync(versionPath)) {
    res.json(JSON.parse(fs.readFileSync(versionPath, 'utf8')));
  } else {
    res.status(404).json({ error: 'Version info not found' });
  }
});

// Changelog endpoint
app.get('/api/v1/changelog', (req, res) => {
  const changelogPath = path.join(__dirname, 'api', 'v1', 'changelog.json');
  if (fs.existsSync(changelogPath)) {
    res.json(JSON.parse(fs.readFileSync(changelogPath, 'utf8')));
  } else {
    res.status(404).json({ error: 'Changelog not found' });
  }
});

// APK download with range support (resume)
app.get('/bin/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!filename.endsWith('.apk')) {
    return res.status(403).json({ error: 'Invalid file type' });
  }

  const filePath = path.join(__dirname, 'bin', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'APK not found', version: filename });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'application/vnd.android.package-archive'
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'application/vnd.android.package-archive',
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Vyzorix Update Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
```

### `Dockerfile`
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json server.js ./
COPY bin/ ./bin/
COPY api/ ./api/
COPY public/ ./public/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

### `render.yaml`
```yaml
services:
  - type: web
    name: vyxorix-update-server
    env: docker
    region: oregon
    plan: free
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
    domains:
      - updates.vyzorix.com
```

### `.github/workflows/deploy.yml`
```yaml
name: Deploy to Render

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate APK files
        run: |
          for apk in bin/*.apk; do
            if [ -f "$apk" ]; then
              echo "Validating: $apk"
              file "$apk" | grep -q "Android application" || {
                echo "ERROR: $apk is not a valid APK"
                exit 1
              }
              sha256sum "$apk"
            fi
          done

      - name: Trigger Render Deploy
        run: |
          curl -X POST "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": "true"}'

      - name: Wait for Deploy
        run: |
          echo "Waiting for Render deployment to complete..."
          sleep 30
          curl -f "https://${{ secrets.RENDER_SERVICE_NAME }}.onrender.com/health" || {
            echo "Health check failed after deployment"
            exit 1
          }
          echo "Deployment successful!"
```

### `scripts/generate_version.sh`
```bash
#!/bin/bash
# Generates version.json from APK metadata

APK_PATH="${1:-bin/latest.apk}"
VERSION_NAME="${2:-1.0.0}"
VERSION_CODE="${3:-1}"
RELEASE_NOTES="${4:-Update released}"
FORCED="${5:-false}"

if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: APK not found at $APK_PATH"
  exit 1
fi

CHECKSUM=$(sha256sum "$APK_PATH" | cut -d' ' -f1)
FILE_SIZE=$(stat -c%s "$APK_PATH")
FILENAME=$(basename "$APK_PATH")
RELEASE_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DOWNLOAD_URL="https://updates.vyzorix.com/bin/$FILENAME"

cat > api/v1/version.json << EOF
{
  "version": "$VERSION_NAME",
  "versionCode": $VERSION_CODE,
  "buildNumber": $VERSION_CODE,
  "minSdkVersion": 29,
  "releaseDate": "$RELEASE_DATE",
  "downloadUrl": "$DOWNLOAD_URL",
  "checksumSha256": "$CHECKSUM",
  "fileSize": $FILE_SIZE,
  "releaseNotes": "$RELEASE_NOTES",
  "forced": $FORCED,
  "changelog": []
}
EOF

echo "Generated api/v1/version.json for $FILENAME"
```

### `scripts/compute_checksum.sh`
```bash
#!/bin/bash
# Computes SHA-256 checksum for an APK file

APK_PATH="${1:-bin/latest.apk}"

if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: APK not found at $APK_PATH"
  exit 1
fi

CHECKSUM=$(sha256sum "$APK_PATH" | cut -d' ' -f1)
echo "$CHECKSUM"
```

### `scripts/validate_apk.sh`
```bash
#!/bin/bash
# Validates APK file before pushing to server

APK_PATH="$1"

if [ -z "$APK_PATH" ]; then
  echo "Usage: ./validate_apk.sh <path-to-apk>"
  exit 1
fi

echo "Validating APK: $APK_PATH"

# Check file exists
if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: File not found"
  exit 1
fi

# Check file type
FILE_TYPE=$(file "$APK_PATH")
if ! echo "$FILE_TYPE" | grep -q "Android application"; then
  echo "ERROR: Not a valid APK file"
  exit 1
fi

# Check file size (should be > 1MB for a real APK)
FILE_SIZE=$(stat -c%s "$APK_PATH")
if [ "$FILE_SIZE" -lt 1048576 ]; then
  echo "WARNING: APK is unusually small ($FILE_SIZE bytes)"
fi

# Compute checksum
CHECKSUM=$(sha256sum "$APK_PATH" | cut -d' ' -f1)
echo "SHA-256: $CHECKSUM"

echo "APK validation passed"
exit 0
```

### `.env.example`
```
# Vyzorix Update Server Environment Variables

# Server configuration
PORT=3000
NODE_ENV=production

# Render service (auto-populated by Render dashboard)
RENDER_SERVICE_ID=your-render-service-id
RENDER_API_KEY=your-render-api-key
RENDER_SERVICE_NAME=vyxorix-update-server

# Optional: Enable debug logging
DEBUG=false
```



👇👇👇

# VyzorixAudioRouter — Repository Tree

```
VyzorixAudioRouter/
│
├── README.md                                              # Project overview, Nokia C22 notes, setup and service lifecycle
├── LICENSE                                                # Repository license
├── .gitignore                                             # Ignore local SDK/build/cache artifacts
├── .editorconfig                                          # Shared formatting conventions
├── .clang-format                                          # Native C++ formatting rules
├── .dockerignore                                          # Ignore Docker upload junk
├── .prettierignore                                        # Ignore formatting-sensitive/generated files
├── build.gradle.kts                                       # Root Gradle plugin/repository configuration
├── settings.gradle.kts                                    # Registers all project modules
├── gradle.properties                                      # JVM/Gradle tuning parameters
├── gradlew                                                # Unix Gradle wrapper
├── gradlew.bat                                            # Windows Gradle wrapper
│
├── gradle/
│   ├── libs.versions.toml                                 # Central dependency version catalog (Room, WorkManager, Coroutines, Retrofit, OkHttp, etc.)
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
│
├── app/                                                   # Final bootstrap APK module
│   ├── build.gradle.kts                                   # APK packaging, signing configs, dependency aggregation (Retrofit, OkHttp, etc.)
│   ├── proguard-rules.pro                                 # Keep rules for Accessibility + MediaProjection + services + Network
│   │                                                      # - Includes: -keepclasseswithmembernames class * { native <methods>; }
│   │                                                      # - Includes Retrofit/OkHttp model serialization rules
│   └── src/main/
│       ├── AndroidManifest.xml                            # Minimal launcher manifest
│       │                                                  # - Declares foregroundServiceType="mediaPlayback"
│       │                                                  # - Declares foregroundServiceType="dataSync"
│       │                                                  # - Declares BIND_ACCESSIBILITY_SERVICE permission
│       │                                                  # - Declares POST_NOTIFICATIONS permission
│       │                                                  # - Registers BootReceiver, PackageChangeReceiver
│       │                                                  # - Registers DiagnosticContentProvider
│       │                                                  # - Declares FileProvider (res/xml/file_paths)
│       │                                                  # - Declares REQUEST_INSTALL_PACKAGES
│       │                                                  # - Declares INTERNET, ACCESS_NETWORK_STATE
│       │                                                  # - BootstrapActivity initially enabled, disabled after Accessibility grant
│       ├── res/
│       │   ├── drawable/
│       │   │   ├── ic_service.xml                         # Persistent foreground notification icon (monochrome)
│       │   │   ├── ic_launcher_foreground.xml             # Lightweight launcher foreground icon
│       │   │   └── ic_notification_small.xml              # Monochrome status bar icon (A13 mandatory)
│       │   ├── mipmap-anydpi-v26/
│       │   │   ├── ic_launcher.xml                        # Adaptive launcher icon (foreground)
│       │   │   └── ic_launcher_background.xml             # Adaptive launcher icon background (A13 mandatory)
│       │   ├── values/
│       │   │   ├── strings.xml                            # Minimal user-facing text (app name, notifications, update prompts)
│       │   │   ├── colors.xml                             # Minimal UI colors for themes
│       │   │   ├── themes.xml                             # Lightweight no-animation themes (transparent)
│       │   │   ├── arrays.xml                             # String arrays for settings and dynamic options
│       │   │   ├── attrs.xml                              # Custom view attributes (if used in notification/overlay layouts)
│       │   │   └── notification_channels.xml              # Notification Channel definitions (IDs, names, importance)
│       │   └── xml/
│       │       ├── accessibility_service_config.xml       # Static Accessibility metadata (description, flags)
│       │       ├── accessibility_service_config_dynamic.xml # Runtime-modifiable accessibility configuration
│       │       ├── network_security_config.xml            # Network security policy (Render backend URL trust rules)
│       │       │                                          # - Defines <domain includeSubdomains="true">your-render-domain.com</domain>
│       │       │                                          # - Blocks cleartext traffic except localhost (debug only)
│       │       └── file_paths.xml                         # FileProvider paths for exporting crash bundles and APK installs
│       │                                                  # - <files-path name="diagnostics" path="diagnostics/" />
│       │                                                  # - <cache-path name="updates" path="updates/" />
│       │
│       ├── res/layout/                                    # RemoteViews Layouts for Notification Dashboard + Overlay
│       │   ├── notification_dashboard_collapsed.xml       # Compact view shown in status bar (Icon + Title + "Active" state)
│       │   ├── notification_dashboard_expanded.xml        # Full expanded view with ScrollView for detailed diagnostics
│       │   ├── notification_section_route.xml             # Tier 1 layout: Route status (Mode, Speaker, Headset)
│       │   ├── notification_section_capture.xml           # Tier 2 layout: Capture engine state (Buffer, Sample Rate)
│       │   ├── notification_section_health.xml            # Tier 3 layout: System health (Risk Score, Uptime)
│       │   ├── notification_section_diagnostics.xml       # Tier 3 layout: Crash signatures and last known state
│       │   ├── overlay_shortcut.xml                       # Layout for OverlayShortcutController (enable/disable toggle)
│       │   └── update_progress.xml                        # Layout for UpdateNotificationHandler (download progress bar)
│       │
│       └── kotlin/com/vyzorix/audiorouter/
│           ├── VyzorixApplication.kt                      # Application entry point
│           │                                              # - Registers GlobalExceptionHandler
│           │                                              # - Triggers VyzorixAppInitializer
│           │                                              # - Sets up strict mode (debug builds only)
│           │                                              # - Initializes Retrofit/OkHttp client for update server
│           ├── VyzorixAppInitializer.kt                   # Early-stage component initialization
│           │                                              # - Creates Notification Channels
│           │                                              # - Runs Room Database Migrations
│           │                                              # - Initializes Android Keystore
│           │                                              # - Loads AppConfig from SharedPreferences
│           │                                              # - Requests all runtime permissions via PermissionAutoGranter
│           ├── BootstrapActivity.kt                       # First-install only trampoline activity
│           │                                              # - Initially enabled in manifest
│           │                                              # - Intent: Settings.ACTION_ACCESSIBILITY_SETTINGS
│           │                                              # - Calls LauncherIconHider.nukeLauncherIcon() after grant
│           │                                              # - Disables itself via PackageManager after first run
│           ├── ProjectionPermissionActivity.kt            # One-shot MediaProjection grant trampoline
│           │                                              # - Starts projection intent
│           │                                              # - Waits for user grant
│           │                                              # - Passes token to ProjectionTokenManager
│           │                                              # - Activity.finish() (immediate)
│           └── AppExitDispatcher.kt                       # Immediate UI teardown utility
│                                                          # - Finishes all active activities
│                                                          # - Ensures process doesn't linger with UI surfaces
│                                                          # - Called after Accessibility grant and projection grant
│
├── core/
│   ├── common/                                            # Shared utility infrastructure
│   │   ├── build.gradle.kts
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── kotlin/com/vyzorix/audiorouter/common/
│   │           ├── constants/
│   │           │   ├── NotificationConstants.kt           # IDs for notification channels and dashboard updates
│   │           │   ├── PermissionConstants.kt             # Permission strings and request codes
│   │           │   ├── PrefKeys.kt                        # SharedPreferences key definitions
│   │           │   ├── BroadcastActions.kt                # Custom broadcast action strings
│   │           │   ├── FilePaths.kt                       # Storage paths for logs, exports, temp files, update cache
│   │           │   └── UpdateApiConstants.kt              # Server base URLs, API endpoints, version check intervals
│   │           ├── enums/
│   │           │   ├── DaemonState.kt                     # INSTALLED, BOOTSTRAP, INITIALIZING, PENDING, RUNNING, SAFE_MODE, RECOVERING, CRASHED, STOPPED
│   │           │   ├── CrashType.kt                       # SYSTEM_DIED, APP_BUG, NATIVE_FAILURE, TIMEOUT
│   │           │   ├── RouteState.kt                      # SPEAKER_FORCED, HEADSET_LOCKED, DRIFTING, UNKNOWN
│   │           │   ├── CaptureState.kt                    # ACTIVE, STARVED, BLOCKED, REVOKED, IDLE
│   │           │   ├── RiskLevel.kt                       # STABLE, ELEVATED, HIGH, CRITICAL
│   │           │   ├── FocusLossType.kt                   # TRANSIENT, TRANSIENT_CAN_DUCK, PERMANENT
│   │           │   └── UpdateState.kt                     # NOT_CHECKED, AVAILABLE, DOWNLOADING, DOWNLOADED, INSTALLING, SUCCESS, FAILED
│   │           ├── extensions/
│   │           │   ├── AudioManagerExtensions.kt          # Helpers: isSpeakerActive(), getCurrentModeName()
│   │           │   ├── ContextExtensions.kt               # Helpers: safeStartForeground(), safeGetSystemService()
│   │           │   ├── NotificationExtensions.kt          # Helpers: toRemoteViews(), applyTextStyle()
│   │           │   ├── AudioTrackExtensions.kt            # Helpers: isPlayingSafely(), writeWithRetry()
│   │           │   ├── AccessibilityExtensions.kt         # Helpers: extractDialogText(), getWindowPackageName()
│   │           │   ├── CursorExtensions.kt                # Helpers: toCrashEventList(), toRouteHistoryList()
│   │           │   └── NetworkExtensions.kt               # Helpers: isConnected(), isMetered(), getActiveNetworkType()
│   │           ├── model/
│   │           │   ├── DaemonStatus.kt                    # Unified status object for dashboard updates
│   │           │   ├── AudioRouteState.kt                 # Current routing state snapshot (mode, devices)
│   │           │   ├── CrashSignature.kt                  # Structured crash pattern data for analysis
│   │           │   ├── PermissionState.kt                 # Current grant/deny state for all permissions
│   │           │   ├── SessionMetadata.kt                 # Diagnostic session metadata (timestamps, counts)
│   │           │   ├── ThermalState.kt                    # Device thermal status and throttling level
│   │           │   └── UpdateInfo.kt                      # Server version info, release notes, download URL
│   │           ├── logging/
│   │           │   ├── Logger.kt                          # Unified Kotlin logging facade
│   │           │   ├── FileLogger.kt                      # Persistent disk logging (thread-safe)
│   │           │   └── LogcatBridge.kt                    # Lightweight logcat forwarding helper
│   │           ├── concurrency/
│   │           │   ├── AppDispatchers.kt                  # Coroutine dispatcher definitions (IO, Default, Main)
│   │           │   └── ServiceScope.kt                    # Long-lived service coroutine scope
│   │           ├── audio/
│   │           │   ├── AudioConstants.kt                  # Shared PCM/audio constants (Sample rates, buffer sizes)
│   │           │   ├── AudioBufferPool.kt                 # Shared reusable PCM buffers to reduce GC
│   │           │   └── AudioDeviceUtils.kt                # Audio route/device helper methods
│   │           ├── device/
│   │           │   ├── NokiaC22DeviceProfile.kt           # Nokia C22 heuristics and compatibility flags
│   │           │   ├── ZygoteCrashMitigator.kt            # Delays risky operations during startup
│   │           │   └── RuntimeHealthMonitor.kt            # Tracks process/runtime instability
│   │           └── utils/
│   │               ├── PermissionHelper.kt                # Runtime permission utility methods
│   │               ├── NotificationHelper.kt              # Foreground notification helpers
│   │               ├── IntentUtils.kt                     # Intent helper methods
│   │               ├── SafeHandler.kt                     # Exception-safe handler posting
│   │               ├── DelayedInitializer.kt              # Defers heavy startup tasks safely
│   │               ├── AppConfig.kt                       # Centralized configuration (feature flags, thresholds)
│   │               ├── NotificationChannelManager.kt      # Creates and configures notification channels (A13 mandatory)
│   │               ├── PermissionIntentHelper.kt          # Centralized PendingIntent creation
│   │               │                                      # - Handles FLAG_IMMUTABLE / FLAG_MUTABLE correctly
│   │               │                                      # - Prevents A12+ SecurityExceptions
│   │               └── UpdateDownloadClient.kt            # Shared HTTP download utility (used by services/updates/)
│   │                                                      # - Handles large file downloads with resume support
│   │                                                      # - Verifies SHA-256 checksum from server
│   │
│   ├── data/                                              # Persistent storage layer
│   │   ├── build.gradle.kts
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── kotlin/com/vyzorix/audiorouter/data/
│   │           ├── converters/
│   │           │   ├── AudioRouteTypeConverters.kt        # Converts AudioDeviceInfo, route enums to/from SQLite
│   │           │   ├── CrashEventTypeConverters.kt        # Converts crash signatures, timestamps, lists
│   │           │   ├── DaemonStateTypeConverters.kt       # Converts daemon state enums, complex objects
│   │           │   ├── DateTimeTypeConverters.kt          # Converts Instant/Long timestamps for all entities
│   │           │   └── UpdateStateTypeConverters.kt       # Converts UpdateState enum, download URLs, timestamps
│   │           ├── database/
│   │           │   ├── DaemonDatabase.kt                  # Room database definition
│   │           │   │                                      # - Stores crash bundles index
│   │           │   │                                      # - Route history transitions
│   │           │   │                                      # - Permission grant timestamps
│   │           │   │                                      # - Update state and download metadata
│   │           │   └── DaemonDatabaseMigrations.kt        # Schema version management
│   │           ├── dao/
│   │           │   ├── DaemonStateDao.kt                  # Room DAO for runtime state persistence
│   │           │   ├── CrashEventDao.kt                   # DAO for crash log entries
│   │           │   ├── RouteHistoryDao.kt                 # DAO for audio route transitions
│   │           │   └── UpdateStateDao.kt                  # DAO for update download/install history
│   │           ├── entity/
│   │           │   ├── CrashEvent.kt                      # @Entity for crash log entries
│   │           │   ├── RouteHistoryEntry.kt               # @Entity for audio route transitions
│   │           │   ├── DaemonStateSnapshot.kt             # @Entity for full daemon state
│   │           │   ├── PermissionGrantRecord.kt           # @Entity for permission history
│   │           │   └── UpdateRecord.kt                    # @Entity for update download/install tracking
│   │           └── repository/
│   │               ├── StateRepository.kt                 # Unified data access layer
│   │               ├── CrashEventRepository.kt            # CRUD operations for crash logs
│   │               ├── RouteHistoryRepository.kt          # CRUD operations for route history
│   │               └── UpdateRepository.kt                # CRUD operations for update state and history
│   │
│   ├── services/                                          # Main headless orchestration layer
│   │   ├── build.gradle.kts
│   │   └── src/main/
│   │       ├── AndroidManifest.xml                        # Module manifest
│   │       │                                              # - Declares <receiver> for BootReceiver (exported=true)
│   │       │                                              # - Declares <receiver> for PackageChangeReceiver
│   │       │                                              # - Declares <service> for PersistentAudioService (mediaPlayback)
│   │       │                                              # - Declares <service> for UpdateDownloadService (dataSync)
│   │       │                                              # - Declares <service> for TrampolineService
│   │       │                                              # - Declares <provider> for DiagnosticContentProvider
│   │       ├── aidl/
│   │       │   └── com/vyzorix/audiorouter/
│   │       │       └── IAudioRouterService.aidl           # IPC bridge definitions
│   │       ├── res/
│   │       │   └── xml/
│   │       │       └── accessibility_service_config.xml   # Accessibility service event subscriptions
│   │       └── kotlin/com/vyzorix/audiorouter/services/
│   │           │
│   │           ├── accessibility/
│   │           │   ├── RouterAccessibilityService.kt      # Primary daemon orchestrator entrypoint
│   │           │   │                                      # - Listens for UI events
│   │           │   │                                      # - Triggers boot sequence on enable
│   │           │   │                                      # - Calls LauncherIconHider.nukeLauncherIcon() on first grant
│   │           │   │                                      # - Starts BootStateRestorer if reboot detected
│   │           │   ├── AccessibilityEventRouter.kt        # Dispatches accessibility event handling to subsystems
│   │           │   ├── PermissionScreenWatcher.kt         # Detects system permission dialogs
│   │           │   ├── SettingsAutomation.kt              # Automates Accessibility/system setting taps
│   │           │   ├── OverlayPermissionAutomator.kt      # Watches overlay permission screens
│   │           │   ├── ProjectionPermissionAutomator.kt   # Detects MediaProjection grant prompts
│   │           │   ├── AudioRouteWatcher.kt               # Detects speaker/headset route changes
│   │           │   ├── UiRecoveryDaemon.kt                # Reopens crashed permission screens
│   │           │   ├── AccessibilityStateTracker.kt       # Tracks enabled/disabled service states
│   │           │   ├── AccessibilityConfigManager.kt      # Manages runtime accessibility capabilities
│   │           │   │                                      # - Toggles serviceInfo.flags dynamically
│   │           │   │                                      # - Disables UI watching during thermal throttle
│   │           │   ├── AccessibilityRecoveryHandler.kt    # Handles Accessibility permission stripped on reboot
│   │           │   │                                      # - Detects if service disabled after boot
│   │           │   │                                      # - Triggers UiRecoveryDaemon to reopen settings
│   │           │   │                                      # - Preserves diagnostic data across recovery
│   │           │   │                                      # - Resumes from LastKnownStateDumper snapshot
│   │           │   └── OverlayShortcutController.kt       # Manages system overlay shortcut for enable/disable
│   │           │                                          # - Draws TYPE_APPLICATION_OVERLAY window
│   │           │                                          # - Contains enable/disable toggle button
│   │           │                                          # - Responds to tap by toggling RouterAccessibilityService
│   │           │                                          # - Uses SYSTEM_ALERT_WINDOW permission
│   │           │                                          # - Hides automatically if Accessibility disabled
│   │           │
│   │           ├── audio/
│   │           │   ├── AudioFocusHandler.kt               # Manages audio focus requests, losses, gains
│   │           │   │                                      # - Handles AUDIOFOCUS_LOSS_TRANSIENT
│   │           │   │                                      # - Handles AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK
│   │           │   │                                      # - Reclaims focus after interruptions end
│   │           │   ├── InterruptionPolicy.kt              # Defines reaction to different focus loss types
│   │           │   │                                      # - Call: Pause capture, maintain VoIP mode
│   │           │   │                                      # - Alarm: Duck volume, resume after
│   │           │   └── session/
│   │           │       ├── AudioSessionRegistry.kt        # Tracks active playback sessions
│   │           │       ├── SessionPriorityManager.kt      # Chooses dominant playback stream
│   │           │       ├── PlaybackUidTracker.kt          # Maps active app audio UIDs
│   │           │       └── CaptureEligibilityChecker.kt   # Checks if playback can be captured
│   │           │
│   │           ├── bootstrap/
│   │           │   ├── TrampolineService.kt               # Lightweight bootstrap foreground service
│   │           │   ├── BootstrapCoordinator.kt            # Waits for Accessibility + projection readiness
│   │           │   ├── PermissionStateMachine.kt          # Tracks initialization state transitions
│   │           │   ├── ServiceTrampoline.kt               # Hands execution to persistent daemon
│   │           │   ├── SelfDestructController.kt          # Stops temporary bootstrap services cleanly
│   │           │   ├── LauncherIconHider.kt               # Permanently disables launcher activity after Accessibility grant
│   │           │   │                                      # - Calls PackageManager.setComponentEnabledSetting(DISABLED)
│   │           │   │                                      # - Prevents user from tapping icon (avoids soft reboot)
│   │           │   │                                      # - Verifies icon hidden via queryIntentActivities()
│   │           │   └── BootStateRestorer.kt               # Restores daemon state after device reboot
│   │           │                                          # - Reads LastKnownStateDumper context from storage
│   │           │                                          # - Restores DaemonState to PENDING (not BOOTSTRAP)
│   │           │                                          # - Checks MediaProjection token validity
│   │           │                                          # - Resumes SpeakerForceEngine loop at previous state
│   │           │                                          # - Skips initialization steps already complete
│   │           │                                          # - Preserves all diagnostic data and crash bundles
│   │           │
│   │           ├── capture/
│   │           │   ├── MediaProjectionCaptureSession.kt   # Manages the actual capture session
│   │           │   ├── PlaybackCaptureEngine.kt           # Captures global media playback streams
│   │           │   ├── AudioCaptureConfig.kt              # Capture configuration models
│   │           │   ├── CapturePermissionStore.kt          # Persists MediaProjection consent state
│   │           │   ├── PlaybackCaptureFactory.kt          # Creates AudioPlaybackCaptureConfiguration
│   │           │   ├── CaptureLifecycleController.kt      # Handles capture start/stop lifecycle
│   │           │   ├── CaptureRecoveryEngine.kt           # Recovers from projection/audio failures
│   │           │   ├── ProjectionTokenManager.kt          # Manages token lifecycle, revocation, renewal
│   │           │   │                                      # - Handles onStop callbacks from system
│   │           │   │                                      # - Re-requests token on revocation
│   │           │   └── TokenPersistence.kt                # Encrypts and stores projection token metadata
│   │           │                                          # - Stores grant time, package, callback state
│   │           │
│   │           ├── compat/
│   │           │   ├── Android13Behavior.kt               # Android 13-specific API workarounds
│   │           │   ├── LegacyAudioFallback.kt             # Android 10/11 compatibility helpers
│   │           │   ├── ForegroundServiceCompat.kt         # Handles FG service API differences
│   │           │   ├── NotificationCompatBridge.kt        # Cross-version notification handling
│   │           │   └── AppInfoConfig.kt                   # Configures app to hide "Open" button in Settings > Apps
│   │           │                                          # - Removes CATEGORY_LAUNCHER intent filter after init
│   │           │                                          # - Sets android:exported="false" on MainActivity
│   │           │                                          # - Configures android:enabled="false" on launcher activity
│   │           │                                          # - Ensures only [Uninstall] [Disable] appear in App Info
│   │           │
│   │           ├── crash/
│   │           │   ├── GlobalExceptionHandler.kt          # Captures uncaught Kotlin exceptions
│   │           │   │                                      # Differentiates CAUSE: SYSTEM_DIED vs CAUSE: APP_BUG
│   │           │   ├── NativeCrashMarker.kt               # Heuristic marker for JNI/native failures
│   │           │   │                                      # Detects sigsegv/signal 11 in own app logs
│   │           │   ├── SoftRebootTracker.kt               # Aggregates timestamps to find instability patterns
│   │           │   │                                      # Maintains rolling buffer of last 5 reboots
│   │           │   └── LastKnownStateDumper.kt            # "Flight Data Recorder" for the daemon
│   │           │                                          # Continuously overwrites last_state.json
│   │           │                                          # Records audio mode, route, foreground package, uptime
│   │           │
│   │           ├── diagnostics/
│   │           │   ├── RoutingLogCollector.kt             # Captures route transition diagnostics
│   │           │   ├── AudioPolicySnapshot.kt             # Dumps AudioManager route states
│   │           │   ├── NokiaC22Compatibility.kt           # Nokia-specific fallback logic
│   │           │   ├── CrashTraceStore.kt                 # Persists crash traces between restarts
│   │           │   ├── SoftRebootDetector.kt              # Detects zygote/service collapse patterns
│   │           │   ├── RuntimeEventTimeline.kt            # Chronological daemon event tracking
│   │           │   └── system/
│   │           │       ├── AppLaunchObserver.kt           # Monitors correlation between new app launches
│   │           │       │                                  # Uses UsageStatsManager MOVE_TO_FOREGROUND
│   │           │       │                                  # Starts 10-second "survival timer" on launch
│   │           │       ├── WindowTransitionTracker.kt     # Watches for abnormal UI window behavior
│   │           │       │                                  # Detects "Flash Crash" (<500ms window life)
│   │           │       ├── PackageStateObserver.kt        # Differentiates fresh vs. established app crashes
│   │           │       │                                  # Logs "Fresh Instability" vs "Stability Failure"
│   │           │       ├── SoftRebootPredictor.kt         # Detects Zygote-style restarts via uptime anomalies
│   │           │       └── RendererFailureDetector.kt     # Detects GPU/SurfaceFlinger failures via "Visual Stasis"
│   │           │                                          # If foreground active but no CONTENT_CHANGED for >5s
│   │           │
│   │           ├── fallback/
│   │           │   ├── PlaybackCaptureFallback.kt         # Retries capture with alternate configs
│   │           │   ├── CommunicationModeFallback.kt       # VoIP-only speaker force mode
│   │           │   ├── SpeakerBypassFallback.kt           # Direct AudioTrack test playback
│   │           │   └── SilentRecoveryMode.kt              # Minimal mode after repeated failures
│   │           │
│   │           ├── foreground/
│   │           │   ├── PersistentAudioService.kt          # Main persistent foreground daemon
│   │           │   │                                      # - foregroundServiceType="mediaPlayback"
│   │           │   │                                      # - Starts after Accessibility grant
│   │           │   │                                      # - Coordinates all audio routing and capture
│   │           │   ├── ServiceNotification.kt             # Basic foreground notification management
│   │           │   ├── ServiceNotificationDashboard.kt    # Builds and updates RemoteViews with live status
│   │           │   │                                      # - Gathers data from DaemonStatusProvider
│   │           │   │                                      # - Pushes updates to NotificationManager every 10s
│   │           │   ├── SilentKeepAliveService.kt          # Hidden low-priority keepalive service
│   │           │   ├── ServiceHeartbeat.kt                # Watches daemon liveness
│   │           │   ├── ServiceRecoveryManager.kt          # Restarts crashed workers/services
│   │           │   ├── BootReceiver.kt                    # Optional reboot auto-restart receiver
│   │           │   └── actions/
│   │           │       ├── NotificationActionReceiver.kt  # Handles notification buttons
│   │           │       ├── QuickToggleAction.kt           # Enable/disable reroute instantly
│   │           │       ├── RestartPipelineAction.kt       # Restarts capture/playback safely
│   │           │       └── EmergencyStopAction.kt         # Kills daemon if instability occurs
│   │           │
│   │           ├── headless/
│   │           │   ├── HeadlessDaemonController.kt        # Main no-UI operational coordinator
│   │           │   ├── HeadlessBootSequence.kt            # Starts services without activity usage
│   │           │   ├── SilentPermissionFlow.kt            # Accessibility-driven permission handling
│   │           │   └── InvisibleRecoveryCoordinator.kt    # Restores pipeline after silent failures
│   │           │
│   │           ├── ipc/
│   │           │   ├── AudioRouterBinder.kt               # Binder service implementation
│   │           │   ├── ServiceConnectionManager.kt        # Internal service connection helper
│   │           │   └── DaemonCommandDispatcher.kt         # Dispatches IPC commands internally
│   │           │
│   │           ├── managers/
│   │           │   ├── AudioRouteManager.kt               # Centralized route authority layer
│   │           │   ├── ProjectionSessionManager.kt        # Owns MediaProjection lifecycle (token validity)
│   │           │   ├── DaemonLifecycleManager.kt          # Coordinates all subsystems (start/stop order)
│   │           │   ├── SpeakerForceManager.kt             # Single source of routing truth
│   │           │   └── RecoveryOrchestrator.kt            # Global recovery coordinator
│   │           │
│   │           ├── metrics/
│   │           │   ├── AudioLatencyMetrics.kt             # Measures capture->speaker latency
│   │           │   ├── RouteSwitchMetrics.kt              # Tracks reroute success/failure timing
│   │           │   ├── CrashMetrics.kt                    # Counts daemon/service crashes
│   │           │   ├── CapturePerformanceTracker.kt       # Detects capture starvation/dropouts
│   │           │   └── BatteryImpactMonitor.kt            # Estimates battery drain impact
│   │           │
│   │           ├── monitoring/
│   │           │   ├── HeadsetStateMonitor.kt             # Watches wired headset state
│   │           │   ├── BluetoothRouteMonitor.kt           # Watches Bluetooth route transitions
│   │           │   ├── AudioFocusMonitor.kt               # Detects focus changes/interruption
│   │           │   ├── PlaybackStateMonitor.kt            # Tracks active playback sessions
│   │           │   ├── DeviceThermalMonitor.kt            # Prevents overheating
│   │           │   ├── RuntimeMemoryMonitor.kt            # Watches memory pressure
│   │           │   ├── ProcessHealthMonitor.kt            # Detects service instability/restarts
│   │           │   └── NetworkStateMonitor.kt             # Monitors WiFi/cellular connectivity for updates
│   │           │                                          # - Detects internet availability
│   │           │                                          # - Triggers update checks when connection restored
│   │           │                                          # - Pauses downloads on metered networks (configurable)
│   │           │
│   │           ├── oem/
│   │           │   ├── NokiaAudioWorkarounds.kt           # Nokia-specific AudioManager retries
│   │           │   ├── UnisocPlatformTweaks.kt            # C22 chipset-specific timing hacks
│   │           │   ├── VendorRouteResetter.kt             # Reasserts route after OEM overrides
│   │           │   └── DeviceQuirkRegistry.kt             # Maps ROM-specific weirdness
│   │           │
│   │           ├── permissions/
│   │           │   ├── PermissionStateRepository.kt       # Persists granted/denied states
│   │           │   ├── PermissionRecoveryDaemon.kt        # Reopens missing permission flows
│   │           │   ├── OverlayPermissionManager.kt        # SYSTEM_ALERT_WINDOW helper
│   │           │   ├── NotificationPermissionManager.kt   # Android 13 POST_NOTIFICATIONS helper
│   │           │   ├── ProjectionGrantCache.kt            # Stores MediaProjection token state
│   │           │   └── PermissionAutoGranter.kt           # Requests and auto-grants all runtime permissions
│   │           │                                          # - POST_NOTIFICATIONS (A13 mandatory)
│   │           │                                          # - SYSTEM_ALERT_WINDOW (for overlay shortcut)
│   │           │                                          # - REQUEST_INSTALL_PACKAGES (for updates)
│   │           │                                          # - Verifies manifest-granted permissions
│   │           │                                          # - Uses ActivityResultContracts for non-UI requests
│   │           │
│   │           ├── playback/
│   │           │   ├── SpeakerPlaybackEngine.kt           # Main PCM replay engine to speaker
│   │           │   ├── AudioTrackController.kt            # Low-level AudioTrack management
│   │           │   ├── AudioTrackFactory.kt               # Creates optimized AudioTrack instances
│   │           │   ├── LatencyOptimizer.kt                # Dynamically tunes playback buffers
│   │           │   ├── RouteRecoveryEngine.kt             # Detects headset rerouting and retries speaker
│   │           │   ├── PlaybackGainController.kt          # Gain/volume normalization
│   │           │   ├── SpeakerOutputVerifier.kt           # Verifies speaker output state
│   │           │   ├── PlaybackThread.kt                  # Dedicated playback worker thread
│   │           │   └── UnderrunRecovery.kt                # Repairs AudioTrack underruns
│   │           │
│   │           ├── provider/
│   │           │   ├── DiagnosticContentProvider.kt       # Shares diagnostic data with other apps
│   │           │   │                                      # - Secure data export via Share Intent
│   │           │   └── AuthorityDefinitions.kt            # Defines content provider authorities
│   │           │
│   │           ├── receivers/                             # Broadcast Receivers
│   │           │   ├── NoOpReceiver.kt                    # Null-action receiver for non-clickable notification
│   │           │   ├── StatusRefreshReceiver.kt           # Forces immediate dashboard content refresh
│   │           │   ├── PackageChangeReceiver.kt           # Detects app installs/uninstalls (triggers observer)
│   │           │   ├── MediaButtonReceiver.kt             # Intercepts media button events (prevents route hijack)
│   │           │   └── ScreenStateReceiver.kt             # Monitors screen on/off (triggers thermal adjustments)
│   │           │
│   │           ├── resilience/
│   │           │   ├── AudioServerReconnectHandler.kt     # Detects/rebuilds after audioserver restart
│   │           │   ├── BinderRecoveryLoop.kt              # Rebinds failed service connections
│   │           │   ├── ThreadIsolationExecutor.kt         # Separates crash-prone workers
│   │           │   ├── DeadObjectRecovery.kt              # Handles binder DeadObjectException safely
│   │           │   └── WatchdogEscalationPolicy.kt        # Escalates recovery stages progressively
│   │           │
│   │           ├── scheduler/
│   │           │   ├── TaskScheduler.kt                   # Central delayed/repeating task coordinator
│   │           │   ├── TaskSchedulerFactory.kt            # Factory for creating constrained WorkManager workers
│   │           │   ├── WakeupAlarmCoordinator.kt          # AlarmManager fallback wake triggers
│   │           │   ├── DeferredStartupQueue.kt            # Delays risky startup operations safely
│   │           │   ├── IdleStateCoordinator.kt            # Handles Doze/App Standby transitions
│   │           │   ├── DeferredTaskWorker.kt              # WorkManager worker for safe delayed operations
│   │           │   ├── WorkerFactory.kt                   # Custom WorkManager factory for dependency injection
│   │           │   │                                      # - Provides DaemonDatabase and Repositories to Workers
│   │           │   └── WorkerConstraints.kt               # Defines battery, network, storage constraints
│   │           │
│   │           ├── security/
│   │           │   ├── ServicePermissionVerifier.kt       # Verifies runtime permissions before execution
│   │           │   ├── ProjectionTokenValidator.kt        # Checks projection token validity
│   │           │   ├── AccessibilityIntegrityChecker.kt   # Verifies service still enabled
│   │           │   ├── SafeIntentSanitizer.kt             # Prevents malformed intent crashes
│   │           │   ├── KeystoreManager.kt                 # Android Keystore for sensitive data encryption
│   │           │   │                                      # - Encrypts projection metadata
│   │           │   └── TokenEncryptor.kt                  # Encrypts/decrypts projection token metadata
│   │           │
│   │           ├── stability/
│   │           │   ├── CrashLoopProtector.kt              # Detects repeated startup crashes
│   │           │   ├── SafeModeController.kt              # Disables risky modules after failures
│   │           │   ├── StartupBackoffScheduler.kt         # Delays retries exponentially
│   │           │   └── ProcessRestartLimiter.kt           # Prevents service restart storms
│   │           │
│   │           ├── state/
│   │           │   ├── RuntimeStateStore.kt               # Persists active daemon state
│   │           │   ├── AudioRouteSnapshot.kt              # Last successful route config
│   │           │   ├── ProjectionStateStore.kt            # Projection lifecycle persistence
│   │           │   └── AccessibilityStateStore.kt         # Tracks daemon readiness state
│   │           │
│   │           ├── storage/
│   │           │   └── logs/
│   │           │       ├── LogFileRotator.kt              # Manages "Black Box" output files
│   │           │       │                                  # Rotates current_log.txt at 2MB limit
│   │           │       ├── CrashSnapshotExporter.kt       # Exports crash bundles for analysis
│   │           │       ├── TimestampedLogFormatter.kt     # Consistent structured log formatting
│   │           │       └── RuntimeSessionIndexer.kt       # Tracks daemon sessions chronologically
│   │           │
│   │           ├── testing/
│   │           │   ├── AudioRouteSimulation.kt            # Simulates headset/speaker transitions
│   │           │   ├── ProjectionStressTester.kt          # Tests projection recovery loops
│   │           │   ├── AccessibilityFlowTester.kt         # Tests permission automation logic
│   │           │   ├── SoftRebootRecoveryTester.kt        # Simulates process collapse recovery
│   │           │   ├── DiagnosticTestRunner.kt            # Runs diagnostic tests on device
│   │           │   ├── MockAccessibilityEvents.kt         # Simulates accessibility events for testing
│   │           │   └── SimulatedCrashTrigger.kt           # Triggers controlled crashes for testing
│   │           │
│   │           ├── updates/                               # Cloud Update System
│   │           │   ├── UpdateChecker.kt                   # Polls server API for version info
│   │           │   │                                      # - GET /api/v1/version
│   │           │   │                                      # - Compares remote version vs local BuildConfig.VERSION
│   │           │   │                                      # - Respects check interval from AppConfig
│   │           │   │                                      # - Triggers update flow if newer version available
│   │           │   ├── UpdateDownloader.kt                # Downloads APK via foreground service
│   │           │   │                                      # - Uses UpdateDownloadService (FOREGROUND_SERVICE_DATA_SYNC)
│   │           │   │                                      # - Downloads to context.cacheDir/updates/
│   │           │   │                                      # - Verifies SHA-256 checksum from server response
│   │           │   │                                      # - Reports progress to UpdateNotificationHandler
│   │           │   │                                      # - Supports resume on network interruption
│   │           │   ├── UpdateInstaller.kt                 # Triggers system install intent
│   │           │   │                                      # - Creates Intent.ACTION_INSTALL_PACKAGE
│   │           │   │                                      # - Uses FileProvider to share APK URI
│   │           │   │                                      # - System shows "Install this update?" dialog
│   │           │   │                                      # - Cannot bypass user confirmation (A13 security)
│   │           │   ├── UpdateConfig.kt                    # Server URLs, API endpoints, version comparison logic
│   │           │   │                                      # - Defines base URL (Render backend)
│   │           │   │                                      # - Defines API endpoints (/version, /changelog, /bin/)
│   │           │   │                                      # - Defines version comparison rules (semver)
│   │           │   │                                      # - Defines check intervals and retry policies
│   │           │   ├── UpdateStateMonitor.kt              # Monitors WiFi/cellular connectivity for update checks
│   │           │   │                                      # - Uses ConnectivityManager.NetworkCallback
│   │           │   │                                      # - Detects internet reachability (DNS ping)
│   │           │   │                                      # - Detects network type (WiFi vs Cellular)
│   │           │   │                                      # - Triggers update checks when connection restored
│   │           │   ├── UpdateStateStore.kt                # Persists update state across reboots
│   │           │   │                                      # - Stores: current check result, download progress
│   │           │   │                                      # - Stores: last check timestamp, install status
│   │           │   │                                      # - Uses Room database (UpdateStateDao)
│   │           │   │                                      # - Survives daemon restarts and soft reboots
│   │           │   └── UpdateNotificationHandler.kt       # Shows update progress/status in notification bar
│   │           │                                          # - "Update available" notification (tappable)
│   │           │                                          # - "Downloading... X%" progress notification
│   │           │                                          # - "Install ready" notification (triggers installer)
│   │           │                                          # - "Update failed" notification with retry option
│   │           │                                          # - Uses same notification channel as dashboard
│   │           │
│   │           ├── voip/
│   │               ├── SilentVoipSession.kt               # Maintains MODE_IN_COMMUNICATION
│   │               ├── CommunicationRouter.kt             # Aggressively reasserts speaker routing
│   │               ├── VoipAudioAnchor.kt                 # Silent looping AudioTrack anchor
│   │               ├── AudioModeKeeper.kt                 # Reapplies communication mode repeatedly
│   │               ├── SpeakerForceEngine.kt              # Keeps speaker route preferred
│   │               ├── CommunicationDeviceSelector.kt     # Selects built-in speaker output device
│   │               └── RoutePersistenceDaemon.kt          # Detects and repairs route fallback
│   │
│   ├── audioengine/                                       # Audio DSP/capture pipeline layer
│   │   ├── build.gradle.kts
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── cpp/
│   │       │   ├── CMakeLists.txt                         # Native audio build definitions
│   │       │   ├── capture_ring_buffer.cpp                # Lock-free PCM buffering
│   │       │   ├── playback_resampler.cpp                 # PCM resampling/alignment
│   │       │   ├── latency_tracker.cpp                    # Timing metrics collection
│   │       │   ├── pcm_mixer.cpp                          # PCM mixing/volume shaping
│   │       │   ├── underrun_guard.cpp                     # Playback underrun detection
│   │       │   ├── audio_clock_sync.cpp                   # Capture/playback clock synchronization
│   │       │   ├── logger_engine.cpp                      # Native logging support
│   │       │   ├── crash_guard.cpp                        # Wraps native processing safely
│   │       │   ├── safe_jni_bridge.cpp                    # Defensive JNI boundary handling
│   │       │   ├── watchdog_ping.cpp                      # Native heartbeat callbacks
│   │       │   └── include/
│   │       │       ├── ring_buffer.h
│   │       │       ├── audio_defs.h
│   │       │       ├── latency_tracker.h
│   │       │       ├── pcm_mixer.h
│   │       │       ├── clock_sync.h
│   │       │       ├── crash_guard.h                      # Native crash protection interfaces
│   │       │       ├── watchdog_ping.h                    # Native watchdog callbacks
│   │       │       ├── safe_jni_bridge.h                  # Safe JNI wrappers
│   │       │       └── audio_latency_profiler.h           # Native latency timing helpers
│   │       └── kotlin/com/vyzorix/audiorouter/audioengine/
│   │           ├── NativeAudioBridge.kt                   # JNI bridge wrapper
│   │           ├── NativeLoader.kt                        # Safe wrapper for System.loadLibrary("audioengine")
│   │           │                                          # - Catches UnsatisfiedLinkError gracefully
│   │           │                                          # - Logs failure and disables native pipeline
│   │           ├── AudioPipeline.kt                       # Capture -> processing -> playback pipeline
│   │           ├── PcmFrame.kt                            # Shared PCM frame container
│   │           ├── AudioPipelineController.kt             # Coordinates native + Kotlin audio stages
│   │           ├── PipelineStateTracker.kt                # Tracks pipeline operational state
│   │           └── NativeSafetyController.kt              # Guards JNI/native runtime stability
│   │
│   └── ui/                                                # Ultra-minimal trampoline UI layer
│       ├── build.gradle.kts
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── res/
│           │   ├── layout/
│           │   │   ├── activity_bootstrap.xml             # Tiny bootstrap permission layout
│           │   │   └── activity_projection.xml            # MediaProjection grant layout
│           │   ├── drawable/
│           │   │   ├── ic_speaker.xml
│           │   │   └── ic_permission.xml
│           │   └── values/
│           │       ├── strings.xml
│           │       ├── themes.xml
│           │       └── colors.xml
│           └── kotlin/com/vyzorix/audiorouter/ui/
│               ├── BootstrapActivity.kt                   # Opens Accessibility settings then exits
│               ├── ProjectionPermissionActivity.kt        # Requests MediaProjection permission then exits
│               ├── UiExitController.kt                    # Immediately destroys transient UI
│               ├── HeadlessModeLauncher.kt                # Hands execution to daemon layer
│               └── CrashSafeActivity.kt                   # Minimal fallback activity with hardware acceleration disabled
│
├── docs/
│   ├── ARCHITECTURE.md                                    # Complete daemon/service/audio architecture
│   ├── NOKIA_C22_NOTES.md                                 # Nokia C22-specific routing observations
│   ├── ACCESSIBILITY_FLOW.md                              # Accessibility-first daemon startup lifecycle
│   ├── MEDIA_PROJECTION_FLOW.md                           # Capture -> replay pipeline explanation
│   ├── VOIP_ROUTE_FORCE.md                                # MODE_IN_COMMUNICATION routing strategy
│   ├── SOFT_REBOOT_ANALYSIS.md                            # Notes about zygote/UI collapse behavior
│   ├── LATENCY_TUNING.md                                  # Audio latency/buffer optimization guide
│   ├── NOKIA_C22_ROUTE_BEHAVIOR.md                        # Device-specific audio quirks
│   ├── SERVICE_LIFECYCLE.md                               # Full daemon startup/shutdown lifecycle
│   ├── RECOVERY_MATRIX.md                                 # Failure -> recovery strategy mappings
│   ├── ACCESSIBILITY_AUTOMATION_RULES.md                  # UI automation trigger mappings
│   ├── PROJECTION_EDGE_CASES.md                           # Projection failure/recovery notes
│   ├── NOTIFICATION_DASHBOARD.md                          # Read-only status interface design
│   └── UPDATE_MECHANISM.md                                # Cloud update system, API contract, Render deployment
│
├── scripts/
│   ├── build_debug.sh                                     # Debug APK build helper
│   ├── build_release.sh                                   # Release build helper
│   ├── run_lint.sh                                        # Runs lint/detekt/static analysis
│   ├── profile_audio_latency.sh                           # Audio timing profiler
│   └── monitor_logcat.sh                                  # Watches runtime crashes/restarts
│
├── config/
│   └── lint/
│       ├── lint.xml                                       # Android lint configuration
│       └── detekt.yml                                     # Kotlin static analysis rules
│
└── .github/
    └── workflows/
        ├── android_build.yml                              # CI APK compilation workflow
        ├── lint.yml                                       # Static analysis CI checks
        ├── release.yml                                    # Tagged release packaging workflow
        └── push_update_bin.yml                            # Pushes APK binary to server repo bin/ folder
```

---



👇👇👇👇👇



# VOIP_ROUTE_FORCE.md — The "Route War" Strategy

## Objective
Force all audio output (Media, System, Notifications) to the **Built-in Speaker** on a Nokia C22 (Android 13) that is permanently stuck in `DEVICE_OUT_WIRED_HEADSET` mode due to a fried internal codec.

## The Problem: The "Phantom Headset" Lock
1. **Hardware Sensor Failure:** The audio codec reports `headset_state = 1` permanently.
2. **Audio Policy Manager:** Android's system-level `AudioPolicyManager` sees this and creates a "hard route" to the headset.
3. **API Immunity:**
   - `AudioManager.setSpeakerphoneOn(true)` is **ignored** in `MODE_NORMAL`.
   - `AudioTrack` configured with `USAGE_MEDIA` is silently redirected to the headset.
   - Even if you force the stream, the system "fights back" within milliseconds, resetting the route.

## The Loophole: `MODE_IN_COMMUNICATION`
Android grants special routing privileges to **Voice over IP (VoIP)** apps (like WhatsApp/Zoom).
- In `MODE_IN_COMMUNICATION`, the system prioritizes user-selected output devices over sensor detections.
- **The Exploit:** If we trick the system into thinking *every* sound is a VoIP call, we can override the headset sensor.

---

## Architecture of the "Route War"

### 1. The API Stack
To win the war, we must coordinate three specific API calls. If one is missing, the headset wins.

| Component | Configuration | Why it Matters |
|-----------|---------------|----------------|
| **AudioManager** | `.mode = MODE_IN_COMMUNICATION` | Unlocks the routing privilege layer. |
| **AudioManager** | `.isSpeakerphoneOn = true` | The actual command to route to speaker. |
| **AudioTrack** | `USAGE_VOICE_COMMUNICATION` | **CRITICAL.** If you play audio using `USAGE_MEDIA`, the system routes *that specific track* to the headset, regardless of the Mode. |

### 2. The Daemon Subsystems

#### `SpeakerForceEngine.kt` (The Enforcer)
- **Role:** Relentlessly applies the correct Mode and Route.
- **Behavior:** Runs a coroutine loop that checks the route state every 500ms. If the system tries to "heal" the route back to the headset (common on Unisoc chipsets), this engine slams it back to Speaker immediately.
- **Logic:**
  ```kotlin
  if (!audioManager.isSpeakerphoneOn) {
      audioManager.mode = MODE_IN_COMMUNICATION
      audioManager.isSpeakerphoneOn = true
  }
  ```

#### `AudioRouteWatcher.kt` (The Scout)
- **Role:** Monitors `ACTION_HEADSET_PLUG` and `AudioManager.getDevices()`.
- **Behavior:** Listens for any change in the active audio device list.
- **Alert:** If `DEVICE_OUT_SPEAKER` disappears from the active list, it triggers the `SpeakerForceEngine`.

#### `CommunicationRouter.kt` (The Pipeline)
- **Role:** Routes the captured audio from the MediaProjection engine into the SpeakerForce engine.
- **Behavior:** Takes raw PCM from the capture buffer, resamples it if needed, and writes it to an `AudioTrack` explicitly built with `AudioAttributes.USAGE_VOICE_COMMUNICATION`.

---

## The "War" Lifecycle (Execution Flow)

This flow begins immediately after `BootstrapCoordinator` finishes permission checks.

### Phase 1: Initialization (The Setup)
1. **Daemon Start:** `PersistentAudioService` starts.
2. **Sensor Check:** `AudioRouteWatcher` queries `getDevices(GET_DEVICES_OUTPUTS)`.
   - *Result:* `DEVICE_OUT_WIRED_HEADSET` is active. `DEVICE_OUT_SPEAKER` is inactive.
3. **Profile Load:** `NokiaC22DeviceProfile` is loaded. It enables "Aggressive Force Mode".

### Phase 2: Escalation (The Takeover)
1. **Mode Switch:** `SpeakerForceEngine` sets `AudioManager.mode = MODE_IN_COMMUNICATION`.
   - *Note:* This changes the system-wide audio profile. EQ settings may change.
2. **Route Force:** `SpeakerForceEngine` calls `setSpeakerphoneOn(true)`.
3. **Verification:** `AudioRouteWatcher` checks `getDevices()` again.
   - *Success:* `DEVICE_OUT_SPEAKER` appears in the list.
   - *Failure:* If it fails, we trigger `LegacyAudioFallback` (Volume ramping / Workarounds).

### Phase 3: The Loop (Maintaining Control)
- **The Heartbeat:** The `SpeakerForceEngine` enters a loop (delayed by 1000ms).
- **The Conflict:**
  - System Audio Policy tries to route a Notification sound to Headset.
  - System Audio Policy tries to route Spotify to Headset.
  - *Our Response:* Because the Global Mode is `COMMUNICATION`, the Audio Policy Manager consults the `setSpeakerphoneOn` flag. It is `true`. The System yields and routes to Speaker.
- **The Correction:** Every 10 seconds, the engine re-confirms the mode and state to prevent "Drift" (where the system slowly reverts settings).

### Phase 4: Audio Injection (The Payload)
1. **Capture:** `MediaProjection` captures the raw system audio mix (Spotify, YouTube, etc.).
2. **Processing:** Audio enters `AudioPipeline`.
3. **Playback:** `CommunicationRouter` creates an `AudioTrack`:
   ```kotlin
   val attributes = AudioAttributes.Builder()
       .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION) // <--- The Key
       .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
       .build()
   ```
4. **Output:** The `AudioTrack` writes PCM frames. Because of the Usage Hint and Global Mode, these frames are forced to the Speaker hardware.

---

## Edge Cases & Recovery Strategies

### 1. The "Silent" Failure (System kills VoIP mode)
- **Scenario:** Android 13 kills the `MODE_IN_COMMUNICATION` state to save battery, reverting to `MODE_NORMAL`.
- **Detection:** `AudioRouteWatcher` sees `isSpeakerphoneOn` return `false` despite our setting.
- **Recovery:** `WatchdogEscalationPolicy` triggers. The `SpeakerForceEngine` kills the current `AudioTrack`, re-asserts the Mode, and creates a fresh `AudioTrack`.

### 2. Focus Theft (Incoming Call / Alarm)
- **Scenario:** A real phone call comes in. Android demands `MODE_RINGTONE` or `MODE_IN_CALL`.
- **Strategy:** We *must* yield immediately to avoid a crash or ANR.
- **Recovery:** `AudioFocusMonitor` detects `AUDIOFOCUS_LOSS_TRANSIENT`. We pause the playback loop. Once the call ends (`AUDIOFOCUS_GAIN`), we immediately snap back to `MODE_IN_COMMUNICATION` and resume the loop.

### 3. The "Zygote" Crash (Soft Reboot)
- **Scenario:** Launching a heavy app triggers the Nokia C22 soft reboot.
- **Strategy:** The `LastKnownStateDumper` ensures that when the service restarts, it knows it was in "Force Mode". It skips the slow setup and jumps straight to Phase 2 (Escalation) to get audio back as fast as possible.

---

## On-Device Verification (No PC Required)

### Method 1: In-App Route State Display
- Create a hidden diagnostic screen accessible via a specific tap pattern (e.g., tap app logo 5 times).
- Display:
  - Current `AudioManager.mode` value
  - `isSpeakerphoneOn` state
  - Active output devices (from `getDevices(GET_DEVICES_OUTPUTS)`)
  - `SpeakerForceEngine` loop status (Running / Paused / Correcting)

### Method 2: Notification-Based Status
- Persistent notification shows routing state:
  - Green indicator: Speaker route active, VoIP mode engaged
  - Yellow indicator: System fighting back, correction in progress
  - Red indicator: Route lost, fallback mode active

### Method 3: Audio Feedback Loop
- Use the `SpeakerForceEngine` to create a "route verification tone":
  - Play a 440Hz tone for 100ms through `USAGE_VOICE_COMMUNICATION` AudioTrack
  - If tone plays through speaker: Route war is active, audio pipeline functional
  - If tone is silent: Audio pipeline blocked or routed to headset (failure)

### Method 4: Physical Confirmation
- Play a YouTube video or music track.
- If audio comes out of the bottom speaker instead of the dead headset jack, the route force is working.
- If audio is silent or comes from the headset jack, check the diagnostic screen for failure points.



👇👇👇

# SYSTEM_MAP.md — Architecture Reference

## Document Purpose
This is the reference for the VyzorixAudioRouter system. It maps every component's role, lifecycle, dependencies, data flows, and failure boundaries. Use this document to understand how the daemon operates from APK install to steady-state, and how it survives crashes, soft reboots, and system interruptions.

---

## 1. Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         app/ (APK Module)                        │
│  - VyzorixApplication.kt                                         │
│  - VyzorixAppInitializer.kt                                      │
│  - BootstrapActivity.kt, ProjectionPermissionActivity.kt         │
│  - AppExitDispatcher.kt                                          │
│  - AndroidManifest.xml (Permissions, Receivers, Providers)       │
│  - Resources (Layouts, Drawables, XML configs)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ depends on
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ core/services/   │ │    core/ui/      │ │  core/common/    │
│ (Orchestration)  │ │ (Trampoline UI)  │ │   (Utilities)    │
│                  │ │                  │ │                  │
│ - accessibility/ │ │ - Activities     │ │ - constants/     │
│ - audio/         │ │ - Layouts        │ │ - enums/         │
│ - bootstrap/     │ │ - Themes         │ │ - extensions/    │
│ - capture/       │ │                  │ │ - model/         │
│ - foreground/    │ └────────┬─────────┘ │ - logging/       │
│ - diagnostics/   │          │           │ - concurrency/   │
│ - managers/      │          │           │ - audio/         │
│ - monitoring/    │          │           │ - device/        │
│ - playback/      │          │           │ - utils/         │
│ - updates/       │          │           └────────┬─────────┘
│ - voip/          │          │                    │
│ - scheduler/     │          │          ┌─────────┴─────────┐
│ - resilience/    │          │          ▼                   ▼
│ - stability/     │          │ ┌──────────────┐ ┌──────────────┐
│ - state/         │          │ │  core/data/  │ │core/audioengine│
│ - storage/       │          │ │ (Persistence)│ │  (Native)    │
│ - testing/       │          │ │              │ │              │
│ - security/      │          │ │ - database/  │ │ - cpp/       │
│ - compat/        │          │ │ - dao/       │ │ - include/   │
│ - provider/      │          │ │ - entity/    │ │ - JNI Bridge │
│ - receivers/     │          │ │ - converters/│ │ - Pipeline   │
│ - fallback/      │          │ │ - repository/│ │ - Safety     │
│ - headless/      │          │ └──────────────┘ └──────────────┘
│ - ipc/           │          │
│ - metrics/       │          │
│ - oem/           │          │
│ - permissions/   │          │
└──────────────────┘          │
```

### Dependency Rules
1. `core/common` has **zero dependencies** on other modules. It is the foundation.
2. `core/data` depends only on `core/common` (for models, constants, extensions).
3. `core/services` depends on `common`, `data`, and `audioengine`. It orchestrates them.
4. `core/audioengine` depends on `common` for constants and models. It is isolated from Room.
5. `app` is the **aggregation module** — it declares all dependencies and packs the final APK.
6. `core/ui` depends on `services` and `common` for permission flows and exit logic.
7. `core/services/updates` depends on `common/network`, `data/repository`, and `services/foreground` for notification updates.

---

## 2. Complete Startup Sequence (Corrected — Accessibility-First, No Icon Tap)

```
T+0s    ┌─────────────────────────────────────────────────────┐
        │  USER ACTION: Install APK via file manager/APK       │
        │  SYSTEM ACTION: App registers on launcher            │
        │  IMPORTANT: User NEVER taps launcher icon            │
        │  (Tapping icon triggers soft reboot on Nokia C22)    │
        │                                                      │
        │  USER ACTION: Opens Settings -> Accessibility        │
        │  - Sees "VyzorixAudioRouter" in the services list    │
        │  - Taps it -> sees two toggles:                      │
        │    1. "Enable VyzorixAudioRouter" (top)              │
        │    2. "Create overlay shortcut" (bottom)             │
        │  USER: Taps "Enable" -> Grants Accessibility         │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+1s    ┌─────────────────────────────────────────────────────┐
        │  SYSTEM ACTION: RouterAccessibilityService bound     │
        │  - onServiceConnected() fires                        │
        │  - AccessibilityStateTracker.markEnabled()           │
        │  - LauncherIconHider.nukeLauncherIcon()              │
        │    - Calls PackageManager.setComponentEnabledSetting │
        │    - Disables BootstrapActivity permanently          │
        │    - Launcher icon disappears from user's view       │
        │  - AppInfoConfig.hideOpenButton()                    │
        │    - Removes CATEGORY_LAUNCHER intent filter         │
        │    - Settings -> Apps now shows only:                │
        │      [Uninstall] [Disable] (no "Open" button)       │
        │  - Triggers VyzorixAppInitializer.execute()          │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+2s    ┌─────────────────────────────────────────────────────┐
        │  INITIALIZATION: VyzorixAppInitializer               │
        │  1. NotificationChannelManager.createChannels()      │
        │     - Creates "daemon_primary" (IMPORTANCE_LOW)      │
        │     - Creates "diagnostics" (IMPORTANCE_MIN)         │
        │     - Creates "updates" (IMPORTANCE_DEFAULT)         │
        │  2. DaemonDatabase.getInstance() + Migrations        │
        │  3. KeystoreManager.initialize()                     │
        │  4. AppConfig.load()                                 │
        │  5. PermissionAutoGranter.requestAll()               │
        │     - POST_NOTIFICATIONS (auto-granted on enable)    │
        │     - SYSTEM_ALERT_WINDOW (overlay, if user enabled) │
        │     - REQUEST_INSTALL_PACKAGES (for future updates)  │
        │     - Verifies manifest-granted:                     │
        │       MODIFY_AUDIO_SETTINGS, RECEIVE_BOOT_COMPLETED, │
        │       FOREGROUND_SERVICE, INTERNET, ACCESS_NETWORK   │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+3s    ┌─────────────────────────────────────────────────────┐
        │  BOOTSTRAP: TrampolineService starts                 │
        │  - BootstrapCoordinator.begin()                      │
        │  - PermissionStateMachine.initState(ACCESS_GRANTED)  │
        │  - Checks: MediaProjection token cached?             │
        │    - YES: Jump to T+6s                               │
        │    - NO: Proceed to T+4s                             │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+4s    ┌─────────────────────────────────────────────────────┐
        │  PERMISSION GRANT (if first time, no cached token)   │
        │  - ProjectionPermissionActivity.launch()             │
        │  - User taps "Start Now" on system dialog            │
        │  - Token passed to ProjectionTokenManager            │
        │  - Activity.finish() immediately                     │
        │  - PermissionStateMachine.update(MEDIA_PROJECTION)   │
        │  - AppExitDispatcher.teardownAll()                   │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+5s    ┌─────────────────────────────────────────────────────┐
        │  OVERLAY SHORTCUT (if user enabled it)               │
        │  - OverlayShortcutController.create()                │
        │  - Draws TYPE_APPLICATION_OVERLAY window             │
        │  - Contains enable/disable toggle button             │
        │  - Responds to tap by toggling Accessibility service │
        │  - Uses SYSTEM_ALERT_WINDOW permission               │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+6s    ┌─────────────────────────────────────────────────────┐
        │  DAEMON LAUNCH: HeadlessBootSequence.execute()       │
        │  - PersistentAudioService.startForeground()          │
        │  - ServiceNotificationDashboard.postInitial()        │
        │  - DaemonLifecycleManager.startAll()                 │
        │    Order matters (see Section 7: Lifecycle Graph)    │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+7s    ┌─────────────────────────────────────────────────────┐
        │  AUDIO ENGINE: Route War Begins                      │
        │  1. AudioRouteWatcher.queryDevices()                 │
        │     - Result: DEVICE_OUT_WIRED_HEADSET active        │
        │  2. SpeakerForceEngine.startLoop()                   │
        │     - Sets AudioManager.mode = MODE_IN_COMMUNICATION │
        │     - Sets AudioManager.isSpeakerphoneOn = true      │
        │  3. NokiaC22DeviceProfile.apply()                    │
        │     - Enables aggressive force mode (500ms checks)   │
        │  4. AudioFocusHandler.register()                     │
        │     - Listens for focus changes/interruptions        │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+8s    ┌─────────────────────────────────────────────────────┐
        │  CAPTURE PIPELINE: MediaProjection Active            │
        │  1. MediaProjectionCaptureSession.open()             │
        │     - Creates AudioRecord with projection token      │
        │  2. PlaybackCaptureEngine.start()                    │
        │     - Begins reading bytes into AudioBufferPool      │
        │  3. NativeLoader.loadLibrary()                       │
        │     - Safe wrapper catches UnsatisfiedLinkError      │
        │     - Creates lock-free ring buffer in C++           │
        │  4. AudioPipelineController.start()                  │
        │     - Connects Java buffer -> JNI -> C++ ring buffer │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+9s    ┌─────────────────────────────────────────────────────┐
        │  MONITORING SYSTEMS: All Observers Active            │
        │  1. AppLaunchObserver.register() (UsageStatsManager) │
        │  2. WindowTransitionTracker.register() (Accessibility│
        │  3. PackageStateObserver.loadFirstRunList()          │
        │  4. SoftRebootPredictor.startUptimeMonitoring()      │
        │  5. RendererFailureDetector.startStasisWatch()       │
        │  6. DeviceThermalMonitor.startPolling()              │
        │  7. ProcessHealthMonitor.startHeartbeat()            │
        │  8. NetworkStateMonitor.register() (for updates)     │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+10s   ┌─────────────────────────────────────────────────────┐
        │  WATCHDOG & STABILITY: Safety Nets Active            │
        │  1. DaemonWatchdog.start()                           │
        │     - Pings every 5s                                 │
        │  2. PipelineHealthChecker.monitor()                  │
        │     - Verifies capture/playback threads running      │
        │  3. CrashLoopProtector.enable()                      │
        │     - Tracks restart count (resets after 10min)      │
        │  4. LastKnownStateDumper.start()                     │
        │     - Writes heartbeat every 10s                     │
        │  5. UpdateChecker.schedule()                         │
        │     - First check in 6 hours (configurable)          │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+11s   ┌─────────────────────────────────────────────────────┐
        │  DASHBOARD: First Full Update                        │
        │  ServiceNotificationDashboard.postUpdate()           │
        │  - Tier 1: Route Status -> SPEAKER FORCED [OK]       │
        │  - Tier 2: Capture -> ACTIVE (48kHz, 0 underruns)   │
        │  - Tier 3: Health -> Risk Score 0/100, Uptime 11s    │
        │  - Notification visible in shade (expandable)        │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
T+12s+  ┌─────────────────────────────────────────────────────┐
        │  STEADY STATE: System Fully Operational              │
        │  - Audio flows: Capture -> Process -> Speaker        │
        │  - Dashboard updates every 10s                       │
        │  - Watchdog pings every 5s                           │
        │  - SpeakerForce corrections every 500ms              │
        │  - Observers monitor silently                        │
        │  - NetworkStateMonitor checks for internet           │
        │  - UpdateChecker polls on schedule (every 6 hours)   │
        │  - Launcher icon: HIDDEN (permanently)               │
        │  - Overlay shortcut: VISIBLE (if user enabled)       │
        │  - App Info: [Uninstall] [Disable] only              │
        └─────────────────────────────────────────────────────┘
```

---

## 3. Service Interaction Matrix

### Core Service Dependencies

| Caller | Callee | Trigger | Purpose | Critical? |
|--------|--------|---------|---------|-----------|
| **RouterAccessibilityService** | AccessibilityEventRouter | onAccessibilityEvent() | Dispatches events to subsystems | YES |
| **RouterAccessibilityService** | LauncherIconHider | First accessibility grant | Disables launcher icon permanently | YES |
| **RouterAccessibilityService** | VyzorixAppInitializer | onServiceConnected() | Initializes all components | YES |
| **RouterAccessibilityService** | UiRecoveryDaemon | Service crash detected | Reopens permission screens | YES |
| **RouterAccessibilityService** | BootStateRestorer | Reboot detected after grant | Resumes from last known state | YES |
| **AccessibilityEventRouter** | PermissionScreenWatcher | TYPE_WINDOW_STATE_CHANGED | Detects system dialogs | YES |
| **AccessibilityEventRouter** | AppLaunchObserver | TYPE_WINDOWS_CHANGED | Tracks app launches | NO |
| **AccessibilityEventRouter** | WindowTransitionTracker | TYPE_WINDOW_CONTENT_CHANGED | Monitors UI transitions | NO |
| **AccessibilityEventRouter** | OverlayShortcutController | User enables overlay | Creates floating toggle | NO |

| Caller | Callee | Trigger | Purpose | Critical? |
|--------|--------|---------|---------|-----------|
| **PersistentAudioService** | DaemonLifecycleManager | onCreate() | Coordinates all subsystem startup | YES |
| **PersistentAudioService** | ServiceNotificationDashboard | Every 10s | Updates notification content | YES |
| **PersistentAudioService** | AudioFocusHandler | onAudioFocusChange() | Manages focus loss/gain | YES |
| **PersistentAudioService** | NetworkStateMonitor | onCreate() | Begins internet connectivity checks | NO |
| **PersistentAudioService** | UpdateChecker | Network connected + schedule | Polls server for updates | NO |
| **DaemonLifecycleManager** | SpeakerForceEngine | start() | Begins route enforcement loop | YES |
| **DaemonLifecycleManager** | MediaProjectionCaptureSession | start() | Opens audio capture | YES |
| **DaemonLifecycleManager** | AppLaunchObserver | start() | Begins launch monitoring | NO |
| **DaemonLifecycleManager** | DaemonWatchdog | start() | Begins health checks | YES |

| Caller | Callee | Trigger | Purpose | Critical? |
|--------|--------|---------|---------|-----------|
| **SpeakerForceEngine** | AudioRouteWatcher | Every 500ms | Checks current route state | YES |
| **SpeakerForceEngine** | NokiaC22DeviceProfile | On route mismatch | Applies device-specific workarounds | YES |
| **SpeakerForceEngine** | WatchdogEscalationPolicy | 3 failed corrections | Escalates recovery stage | YES |
| **AudioRouteWatcher** | AudioRouteManager | Route change detected | Updates centralized route state | YES |
| **AudioRouteManager** | SpeakerForceManager | Route authority change | Reasserts routing truth | YES |

| Caller | Callee | Trigger | Purpose | Critical? |
|--------|--------|---------|---------|-----------|
| **MediaProjectionCaptureSession** | PlaybackCaptureEngine | Token granted | Opens AudioRecord | YES |
| **PlaybackCaptureEngine** | NativeAudioBridge | Buffer high water mark | Transfers PCM to C++ | YES |
| **NativeAudioBridge** | AudioPipelineController | JNI callback | Coordinates native pipeline | YES |
| **AudioPipelineController** | SpeakerPlaybackEngine | PCM ready | Writes to AudioTrack | YES |
| **SpeakerPlaybackEngine** | AudioTrackFactory | Track needed | Creates optimized AudioTrack | YES |
| **SpeakerPlaybackEngine** | LatencyOptimizer | Underrun detected | Tunes playback buffers | NO |

| Caller | Callee | Trigger | Purpose | Critical? |
|--------|--------|---------|---------|-----------|
| **UpdateChecker** | NetworkStateMonitor | Internet available | Checks connectivity before polling | NO |
| **UpdateChecker** | UpdateConfig | On schedule | Gets server URL and endpoints | NO |
| **UpdateChecker** | UpdateNotificationHandler | Update available | Shows "Update ready" notification | NO |
| **UpdateNotificationHandler** | UpdateDownloader | User taps "Download" | Starts foreground download | YES |
| **UpdateDownloader** | UpdateDownloadService | Download triggered | Uses dataSync foreground service | YES |
| **UpdateDownloader** | UpdateConfig | During download | Gets checksum, download URL | YES |
| **UpdateDownloader** | UpdateStateStore | Download complete | Persists download state | NO |
| **UpdateInstaller** | FileProvider | APK downloaded | Creates content:// URI | YES |
| **UpdateInstaller** | PermissionAutoGranter | Before install | Checks REQUEST_INSTALL_PACKAGES | YES |

| Caller | Callee | Trigger | Purpose | Critical? |
|--------|--------|---------|---------|-----------|
| **LogFileRotator** | RollingLogWriter | File size > 2MB | Rotates to new file | NO |
| **LogFileRotator** | RuntimeSessionIndexer | New session created | Updates index metadata | NO |
| **CrashSnapshotExporter** | FileProvider | User requests export | Creates shareable URI | NO |
| **CrashSnapshotExporter** | IntentUtils | Export triggered | Fires ACTION_SEND intent | NO |

| Caller | Callee | Trigger | Purpose | Critical? |
|--------|--------|---------|---------|-----------|
| **GlobalExceptionHandler** | LastKnownStateDumper | Uncaught exception | Dumps current state | YES |
| GlobalExceptionHandler** | LogStreamCollector | Exception caught | Logs crash context | YES |
| **NativeCrashMarker** | Logger | Signal 11 detected | Flags native failure | YES |
| **SoftRebootTracker** | StateRepository | Reboot detected | Persists reboot history | NO |
| **DaemonWatchdog** | ServiceRecoveryManager | Ping timeout | Attempts service restart | YES |
| **ServiceRecoveryManager** | CrashLoopProtector | Restart triggered | Checks if in crash loop | YES |
| **CrashLoopProtector** | StartupBackoffScheduler | Loop detected | Delays next retry | YES |
| **BootStateRestorer** | LastKnownStateDumper | Service restart after reboot | Reads pre-crash context | YES |
| **BootStateRestorer** | ProjectionTokenManager | After reboot | Checks token validity | YES |
| **AccessibilityRecoveryHandler** | UiRecoveryDaemon | Accessibility stripped on reboot | Reopens settings | YES |

### Interaction Rules
1. **No Circular Dependencies:** A calls B calls C. C must never call A directly. If C needs to trigger A, it must use `DaemonCommandDispatcher` (IPC) or `BroadcastActions` (system events).
2. **Critical Path First:** All `Critical? = YES` interactions must complete before `Critical? = NO` interactions begin. This is enforced by `DaemonLifecycleManager.startAll()`.
3. **Thread Safety:** Cross-thread interactions use `AppDispatchers.IO` for database/file ops, `AppDispatchers.Default` for audio processing, and `SafeHandler` for main thread posting.
4. **Update Flow Isolation:** Update checks and downloads run on separate coroutines from audio processing. A failed download must never block the audio pipeline.

---

## 4. Data Flow Architecture

### 4.1 Audio Data Pipeline (Primary Flow)

```
SYSTEM AUDIO MIXER
(Spotify, YouTube, Notifications, Media, Game Audio)
       │
       ▼
MediaProjection API (Android 10+)
- Requires user-granted token
- Captures system audio mix (bypasses app-level blocks)
- Token managed by ProjectionTokenManager
- Token persists across reboots
       │
       ▼
AudioRecord (Java/Kotlin Layer)
- Created by PlaybackCaptureEngine
- Reads PCM bytes into AudioBufferPool
- Config: 48kHz, 16-bit, mono/stereo
- Thread: Dedicated capture thread (AppDispatchers.IO)
       │
       ▼
NativeAudioBridge (JNI Boundary)
- Triggered at 50% buffer fill (High Water Mark)
- Copies Java byte[] to native memory
- Defensive JNI wrapper (catches sigsegv)
- Thread: JNI call from IO dispatcher
       │
       ▼
C++ Ring Buffer (Native Memory)
- Lock-free single-producer/single-consumer
- Located in capture_ring_buffer.cpp
- Size: 2-4MB (configurable via AppConfig)
- Thread: Native thread (no GC pressure)
       │
       ▼
PCM Processing (Native Layer)
1. playback_resampler.cpp: Aligns sample rates
2. pcm_mixer.cpp: Mixes streams, normalizes volume
3. underrun_guard.cpp: Detects/prevents buffer starvation
4. latency_tracker.cpp: Measures capture->playback latency
5. audio_clock_sync.cpp: Syncs capture/playback clocks
Thread: Native processing thread (Default dispatcher equiv)
       │
       ▼
AudioPipelineController (Kotlin)
- Coordinates native -> Kotlin handoff
- Manages PipelineStateTracker
- Handles NativeSafetyController callbacks
- Thread: AppDispatchers.Default
       │
       ▼
SpeakerPlaybackEngine (Kotlin)
1. Reads from PipelineStateTracker
2. Creates AudioTrack via AudioTrackFactory
   - Usage: USAGE_VOICE_COMMUNICATION (CRITICAL)
   - Content Type: CONTENT_TYPE_SPEECH
3. Writes PCM frames to AudioTrack
4. LatencyOptimizer tunes buffer size dynamically
5. UnderrunRecovery repairs buffer starvation
Thread: Dedicated playback thread (AppDispatchers.Default)
       │
       ▼
AudioTrack (System Output)
- Routes to DEVICE_OUT_SPEAKER (enforced by SpeakerForce)
- Mode: MODE_IN_COMMUNICATION (VoIP privilege)
- Bypasses headset sensor (overriding broken codec)
       │
       ▼
PHYSICAL SPEAKER (Nokia C22 bottom-firing speaker)
Audio is now audible to user
```

### 4.2 Status Data Pipeline (Dashboard Flow)

```
Daemon Subsystems (All 15+ packages)
- SpeakerForceEngine: Route state
- PlaybackCaptureEngine: Buffer health
- SoftRebootPredictor: Risk score
- DeviceThermalMonitor: Temperature
- ProcessHealthMonitor: Service liveness
- CrashMetrics: Crash counts
- BatteryImpactMonitor: Drain estimate
- UpdateStateStore: Update status
- NetworkStateMonitor: Connectivity state
       │
       ▼
DaemonStatusProvider (Aggregator)
- Gathers data from all subsystems every 10s
- Creates unified DaemonStatus.kt model
- Applies state sanitization (removes PII, formats text)
- Thread: AppDispatchers.IO
       │
       ▼
ServiceNotificationDashboard
1. Receives DaemonStatus model
2. Builds RemoteViews from layout XMLs
   - notification_dashboard_collapsed.xml
   - notification_dashboard_expanded.xml
   - notification_section_*.xml (Tier 1, 2, 3)
3. Applies text updates to all TextView fields
4. Applies color coding (Green/Yellow/Red/Gray)
5. Handles scroll/cycling fallback if height exceeded
Thread: Main thread (via SafeHandler)
       │
       ▼
NotificationManager (System UI Process)
- Renders RemoteViews in system notification shade
- Independent of app process (safe from Zygote crashes)
- Supports expand/collapse via chevron
- Supports scroll within expanded view (if enabled)
       │
       ▼
USER VISIBLE
Pull down notification shade -> Expand -> Read status
No app launch. No UI rendering. Zero crash risk.
```

### 4.3 Update Data Pipeline (Cloud Flow)

```
RENDER BACKEND SERVER
- Serves version.json at /api/v1/version
- Serves changelog.json at /api/v1/changelog
- Serves APK binaries at /bin/audiorouter-v*.apk
- HTTPS enforced, CORS configured
- Auto-deployed via GitHub Actions on tag push
       │
       ▼
NetworkStateMonitor
- Detects internet connectivity
- Checks WiFi vs Cellular
- Verifies reachability (DNS ping)
- Triggers update checks when connection restored
       │
       ▼
UpdateChecker
- Polls GET /api/v1/version on schedule (every 6 hours)
- Sends headers: X-App-Version, X-App-Build, X-Device-Model
- Compares remote versionCode vs local BuildConfig.VERSION
- If update available: triggers UpdateNotificationHandler
- If no update: schedules next check
       │
       ▼
UpdateNotificationHandler
- Posts "Update available" notification
- Shows version, release notes, [Download] [Dismiss]
- User taps "Download" -> triggers UpdateDownloader
- If forced update: no dismiss option
       │
       ▼
UpdateDownloader (Foreground Service)
- Uses UpdateDownloadService (FOREGROUND_SERVICE_DATA_SYNC)
- Downloads APK to context.cacheDir/updates/
- Shows progress notification (0% -> 100%)
- Supports resume on network interruption (Range header)
- Verifies SHA-256 checksum from server response
- On success: marks state as DOWNLOADED
       │
       ▼
UpdateInstaller
- Creates Intent.ACTION_INSTALL_PACKAGE
- Uses FileProvider to generate content:// URI
- System shows "Install this update?" dialog
- User must tap "Install" (cannot be bypassed on A13)
- APK signature verified by system (must match app)
       │
       ▼
SYSTEM INSTALLATION
- PackageInstaller verifies signature
- Installs new version, preserves app data
- Daemon stops, restarts with new code
- BootStateRestorer reads LastKnownStateDumper
- Resumes from previous state (no fresh bootstrap)
- UpdateStateStore marks INSTALL_SUCCESS
- Dashboard shows: "Updated to v{newVersion}"
```

### 4.4 Diagnostic Data Pipeline (Crash Bundle Flow)

```
Observers (Diagnostics Package)
- AppLaunchObserver: Launch events
- WindowTransitionTracker: UI anomalies
- SoftRebootPredictor: Uptime gaps
- RendererFailureDetector: Visual stasis
- PackageStateObserver: Fresh vs established crashes
       │
       ▼
LogStreamCollector (Aggregator)
- Receives events from all observers
- Formats into structured log lines
- Tags each line with timestamp, source, severity
- Thread: AppDispatchers.IO
       │
       ▼
RollingLogWriter (Buffer)
- Writes to current_session.log
- Monitors file size (2MB limit)
- Rotates file when limit reached
- Sanitizes user-identifiable data before writing
Thread: AppDispatchers.IO
       │
       ▼
LogFileRotator (Storage Manager)
- Renames current_session.log -> crash_bundle_TIMESTAMP.log
- Creates fresh current_session.log
- Updates RuntimeSessionIndexer metadata
- Deletes oldest bundles if count > 10
Thread: AppDispatchers.IO
       │
       ▼
CrashSnapshotExporter (Export Handler)
- Triggered by user action or automated crash detection
- Bundles log files into .zip archive
- Creates content:// URI via FileProvider
- Fires ACTION_SEND Intent (Share dialog)
- User can share to email, cloud storage, file manager
Thread: AppDispatchers.IO
```

---

## 5. Failure Boundaries & Recovery Strategies

### 5.1 Failure Matrix

| Failure Point | Detection Method | Immediate Response | Recovery Strategy | Escalation Path |
|---------------|------------------|--------------------|-------------------|-----------------|
| **PersistentAudioService dies** | ServiceHeartbeat timeout | DaemonWatchdog triggers restart | ServiceRecoveryManager restarts service with LastKnownStateDumper context | If restart fails 3x in 5min -> CrashLoopProtector enters SafeMode |
| **AccessibilityService disabled** | AccessibilityStateTracker detects toggle off | UiRecoveryDaemon alerts user | SettingsAutomation re-opens accessibility settings via intent | If user doesn't re-enable in 60s -> Notification alert + vibration |
| **MediaProjection token revoked** | ProjectionTokenManager onStop callback | CaptureRecoveryEngine pauses capture | ProjectionPermissionAutomator re-requests token via trampoline activity | If re-request fails -> CommunicationModeFallback activates (VoIP-only) |
| **AudioFocus lost (Call/Alarm)** | AudioFocusMonitor receives loss callback | AudioFocusHandler pauses capture | InterruptionPolicy decides action (pause/duck/ignore) | On focus regain -> AudioFocusHandler resumes capture within 500ms |
| **Speaker route drifts to headset** | AudioRouteWatcher detects device change | SpeakerForceEngine corrects route | NokiaC22DeviceProfile applies aggressive workaround | If correction fails 5x -> VendorRouteResetter forces HAL reset |
| **Native library load fails** | NativeLoader catches UnsatisfiedLinkError | NativeSafetyController disables pipeline | Logs error, falls back to Java-only AudioRecord | If Java AudioRecord also fails -> SpeakerBypassFallback activates |
| **Zygote soft reboot** | SoftRebootTracker detects uptime anomaly | All services die | BootReceiver restarts PersistentAudioService | LastKnownStateDumper provides pre-crash context -> BootStateRestorer resumes state |
| **Ring buffer overflow** | UnderrunGuard detects full buffer | LatencyOptimizer increases buffer size | PCM Mixer drops oldest frames to prevent deadlock | If overflow persists -> CapturePerformanceTracker flags starvation |
| **Notification dashboard fails** | ServiceNotificationDashboard detects post failure | NotificationCompatBridge recreates notification | Falls back to compact view (Tier 1 only) | If all notification channels fail -> SilentKeepAliveService maintains daemon |
| **Database corruption** | DaemonDatabaseMigrations detects schema mismatch | StateRepository opens read-only fallback | Runs migration on next clean boot | If migration fails -> Wipes and recreates database |
| **Thermal throttling** | DeviceThermalMonitor detects critical temp | SafeModeController disables capture | Reduces sample rate 48kHz -> 44.1kHz -> 32kHz | If temp continues rising -> EmergencyStopAction kills daemon |
| **Permission denied (A13)** | NotificationPermissionManager checks POST_NOTIFICATIONS | Blocks foreground service start | Requests permission via system dialog | If user denies -> Service cannot start, shows permanent error |
| **Launcher icon tapped** | BootstrapActivity.onCreate() | Immediate finish() + crash prevention | LauncherIconHider has already disabled it | If somehow triggered -> AppExitDispatcher.teardownAll() |
| **Update download fails** | UpdateDownloader catches IOException | Pauses download, saves progress | Resume via Range header on reconnect (up to 3 retries) | If all retries fail -> UpdateNotificationHandler shows retry |
| **Update install rejected** | PackageManager returns INSTALL_FAILED_* | Logs error code, notifies user | Prompts user to enable "Install unknown apps" | If signature mismatch -> Uninstall old version, clean install |
| **Server unreachable** | UpdateChecker HTTP timeout | Logs error, schedules retry | Exponential backoff: 30m -> 1h -> 6h | If server down for >24h -> Continues normal operation |
| **Accessibility stripped on reboot** | BootStateRestorer detects service not enabled | Triggers AccessibilityRecoveryHandler | UiRecoveryDaemon re-opens settings, user re-enables | BootStateRestorer resumes from LastKnownStateDumper |

### 5.2 Recovery Orchestration Order

```
1. Stop affected subsystem (isolate the failure)
2. Log crash context to LastKnownStateDumper
3. Increment CrashMetrics counter
4. Check CrashLoopProtector (are we in a restart storm?)
   - If YES: Activate StartupBackoffScheduler (exponential delay)
   - If NO: Proceed to step 5
5. Attempt primary recovery (e.g., restart service, re-request token)
6. Verify recovery success (e.g., check route state, buffer health)
   - If SUCCESS: Clear SafeModeController flags, resume normal operation
   - If FAILURE: Proceed to step 7
7. Activate fallback (e.g., CommunicationModeFallback, SpeakerBypassFallback)
8. If fallback also fails: Enter SilentRecoveryMode (minimal operation)
9. Update dashboard with recovery status
10. Log recovery outcome to RuntimeEventTimeline
```

---

## 6. Thread & Coroutine Assignment

### 6.1 Thread Model

```
MAIN THREAD (UI)
- Activities: BootstrapActivity, ProjectionPermissionActivity
- AccessibilityService callbacks
- Notification updates (via SafeHandler)
- BroadcastReceiver onReceive()
- GlobalExceptionHandler
- OverlayShortcutController (floating window)
- UpdateNotificationHandler (notification posts)
Rule: No blocking operations. No Audio I/O. No DB writes.

AppDispatchers.IO (Database/Files/Network)
- Room DAO operations (DaemonStateDao, CrashEventDao)
- File I/O (LogFileRotator, RollingLogWriter)
- Keystore operations (KeystoreManager, TokenEncryptor)
- SharedPreferences reads/writes (AppConfig, PrefKeys)
- NotificationChannelManager setup
- UpdateChecker HTTP requests
- UpdateDownloader APK downloads
- NetworkStateMonitor connectivity checks
Rule: All storage and network operations. Thread-safe.

AppDispatchers.Default (CPU-Intensive)
- PCM processing (resampling, mixing, volume shaping)
- Metrics calculation (latency, crash counts, battery)
- Signature pattern matching (SoftRebootPredictor)
- Data aggregation (DaemonStatusProvider)
- Log formatting (TimestampedLogFormatter)
- Update checksum verification (SHA-256)
Rule: Heavy computation. No blocking I/O. No UI calls.

ServiceScope (Long-Lived Service)
- SpeakerForceEngine loop (every 500ms)
- DaemonWatchdog pings (every 5s)
- Dashboard updates (every 10s)
- Monitoring polls (every 30s)
- Heartbeat checks (every 15s)
- UpdateChecker polling (every 6 hours)
Rule: Runs as long as service is alive. Cancels onDestroy.

DEDICATED THREADS (Isolation)
- PlaybackThread: AudioTrack write loop
- CaptureThread: AudioRecord read loop
- ThreadIsolationExecutor: Crash-prone workers
- NativeThread: C++ ring buffer processing
- UpdateDownloadService: Foreground data sync service
Rule: Isolated from coroutine dispatchers. Direct JNI.
```

### 6.2 Thread Safety Rules

1. **No Cross-Thread State Mutation:** Shared state (DaemonStatus, RouteState) must be updated via `AtomicReference` or `Mutex`-protected blocks.
2. **UI Updates on Main:** All `RemoteViews.setTextViewText()` and notification posts must use `SafeHandler.postToMain()`.
3. **Database on IO:** All Room operations must run on `AppDispatchers.IO`. No exceptions.
4. **Network on IO:** All HTTP requests (update checks, APK downloads) must run on `AppDispatchers.IO`.
5. **Native on Dedicated:** JNI calls must use `ThreadIsolationExecutor` to prevent native crashes from killing the Kotlin coroutine pool.
6. **Cancellation Propagation:** `ServiceScope.cancel()` must cascade to all child jobs (watchdog loops, monitoring polls, dashboard updates, update checks).
7. **Foreground Service Isolation:** `UpdateDownloadService` runs as a separate foreground service with `dataSync` type, isolated from `PersistentAudioService` (`mediaPlayback` type).

---

## 7. Lifecycle Dependency Graph

### 7.1 Startup Order (Strict — Accessibility-First)

```
Phase 1: Installation & First Access (T+0s to T+1s)
├── 1.1 User installs APK via file manager
├── 1.2 System registers app on launcher (icon visible)
├── 1.3 User opens Settings -> Accessibility
├── 1.4 User finds "VyzorixAudioRouter" in services list
├── 1.5 User enables Accessibility service
└── 1.6 User optionally enables "Create overlay shortcut"

Phase 2: Accessibility Grant (T+1s to T+2s)
├── 2.1 System binds RouterAccessibilityService
├── 2.2 onServiceConnected() fires
├── 2.3 LauncherIconHider.nukeLauncherIcon()
│   └── Disables BootstrapActivity permanently
├── 2.4 AppInfoConfig.hideOpenButton()
│   └── Removes "Open" from Settings -> Apps
└── 2.5 AccessibilityStateTracker.markEnabled()

Phase 3: Initialization (T+2s to T+3s)
├── 3.1 VyzorixAppInitializer.execute()
│   ├── 3.1.1 NotificationChannelManager.createChannels()
│   │   └── Creates: daemon_primary, diagnostics, updates
│   ├── 3.1.2 DaemonDatabase.getInstance() + Migrations
│   ├── 3.1.3 KeystoreManager.initialize()
│   ├── 3.1.4 AppConfig.load()
│   └── 3.1.5 PermissionAutoGranter.requestAll()
│       ├── POST_NOTIFICATIONS (A13 mandatory)
│       ├── SYSTEM_ALERT_WINDOW (overlay, if enabled)
│       └── REQUEST_INSTALL_PACKAGES (for updates)
└── 3.2 GlobalExceptionHandler.register()

Phase 4: Bootstrap (T+3s to T+5s)
├── 4.1 TrampolineService.startForeground()
├── 4.2 BootstrapCoordinator.begin()
├── 4.3 PermissionStateMachine.checkAll()
│   ├── 4.3.1 POST_NOTIFICATIONS check
│   ├── 4.3.2 MediaProjection token check (cached?)
│   └── 4.3.3 SYSTEM_ALERT_WINDOW check (optional)
├── 4.4 IF token NOT cached:
│   ├── 4.4.1 ProjectionPermissionActivity.launch()
│   ├── 4.4.2 User taps "Start Now" on system dialog
│   ├── 4.4.3 Token passed to ProjectionTokenManager
│   └── 4.4.4 Activity.finish() immediately
├── 4.5 IF overlay enabled:
│   └── 4.5.1 OverlayShortcutController.create()
└── 4.6 ServiceTrampoline.handOffToDaemon()

Phase 5: Core Services (T+6s to T+7s)
├── 5.1 PersistentAudioService.startForeground()
│   └── Type: mediaPlayback
├── 5.2 ServiceNotificationDashboard.postInitial()
├── 5.3 DaemonLifecycleManager.startAll()
│   ├── 5.3.1 AudioRouteManager.initialize()
│   ├── 5.3.2 SpeakerForceManager.initialize()
│   ├── 5.3.3 ProjectionSessionManager.initialize()
│   └── 5.3.4 RecoveryOrchestrator.initialize()
└── 5.4 HeadlessDaemonController.activate()

Phase 6: Audio Pipeline (T+7s to T+9s)
├── 6.1 AudioFocusHandler.register()
├── 6.2 SpeakerForceEngine.startLoop()
│   ├── 6.2.1 AudioRouteWatcher.queryDevices()
│   ├── 6.2.2 NokiaC22DeviceProfile.applyWorkarounds()
│   └── 6.2.3 AudioManager.setMode(MODE_IN_COMMUNICATION)
├── 6.3 MediaProjectionCaptureSession.open()
├── 6.4 PlaybackCaptureEngine.start()
├── 6.5 NativeLoader.loadLibrary()
├── 6.6 NativeAudioBridge.initialize()
└── 6.7 AudioPipelineController.start()

Phase 7: Monitoring & Safety (T+9s to T+11s)
├── 7.1 DaemonWatchdog.start()
├── 7.2 PipelineHealthChecker.monitor()
├── 7.3 AppLaunchObserver.register()
├── 7.4 WindowTransitionTracker.register()
├── 7.5 SoftRebootPredictor.startUptimeMonitoring()
├── 7.6 RendererFailureDetector.startStasisWatch()
├── 7.7 DeviceThermalMonitor.startPolling()
├── 7.8 ProcessHealthMonitor.startHeartbeat()
├── 7.9 NetworkStateMonitor.register()
├── 7.10 UpdateChecker.schedule()
├── 7.11 CrashLoopProtector.enable()
└── 7.12 LastKnownStateDumper.start()

Phase 8: Steady State (T+12s+)
├── 8.1 DaemonLifecycleManager.markReady()
├── 8.2 Dashboard updates every 10s
├── 8.3 Watchdog pings every 5s
├── 8.4 SpeakerForce corrections every 500ms
├── 8.5 All observers running silently
├── 8.6 NetworkStateMonitor checking connectivity
└── 8.7 UpdateChecker polling every 6 hours
```

### 7.2 Post-Reboot State Restoration Order

```
Device Reboots
    │
    ▼
BootReceiver.onReceive()
    │
    ▼
BootStateRestorer.checkLastState()
    │
    ├── If LastKnownStateDumper shows: ACCESSIBILITY_WAS_GRANTED
    │   │
    │   ▼
    │   RouterAccessibilityService.autoStarts()
    │   │
    │   ▼
    │   BootStateRestorer.restoreFromSnapshot()
    │   ├── Skips Phases 1-4 of startup
    │   ├── Restores DaemonState to PENDING (not BOOTSTRAP)
    │   ├── Checks MediaProjection token validity
    │   │   ├── Token valid -> Resume capture pipeline
    │   │   └── Token invalid -> Request re-grant
    │   ├── Restores SpeakerForceEngine loop state
    │   ├── Resumes Dashboard updates
    │   ├── Continues from where it left off
    │   └── Logs "Post-Reboot Restoration Complete"
    │
    └── If LastKnownStateDumper shows: ACCESSIBILITY_REVOKED
        │
        ▼
        AccessibilityRecoveryHandler.trigger()
        │
        ▼
        UiRecoveryDaemon.opensSettings()
        │
        ▼
        User re-enables Accessibility
        │
        ▼
        BootStateRestorer.restoreFromSnapshot()
        (Same as above - resumes from last known state)
```

### 7.3 Shutdown Order (Reverse)

```
Phase 1: Stop Monitoring (T+0s to T+1s)
├── 1.1 DaemonWatchdog.stop()
├── 1.2 All Observers.unregister()
├── 1.3 LastKnownStateDumper.finalize()
├── 1.4 CrashLoopProtector.reset()
└── 1.5 UpdateChecker.cancel()

Phase 2: Stop Audio Pipeline (T+2s to T+3s)
├── 2.1 AudioPipelineController.stop()
├── 2.2 NativeAudioBridge.cleanup()
├── 2.3 PlaybackCaptureEngine.stop()
├── 2.4 MediaProjectionCaptureSession.close()
├── 2.5 SpeakerForceEngine.stopLoop()
└── 2.6 AudioFocusHandler.unregister()

Phase 3: Stop Core Services (T+4s to T+5s)
├── 3.1 DaemonLifecycleManager.stopAll()
├── 3.2 SpeakerForceManager.release()
├── 3.3 AudioRouteManager.release()
├── 3.4 ServiceNotificationDashboard.dismiss()
├── 3.5 PersistentAudioService.stopForeground()
└── 3.6 UpdateDownloadService.stopForeground()

Phase 4: Cleanup (T+6s to T+7s)
├── 4.1 ServiceScope.cancel()
├── 4.2 ThreadIsolationExecutor.shutdown()
├── 4.3 DaemonDatabase.close()
├── 4.4 KeystoreManager.release()
├── 4.5 OverlayShortcutController.destroy()
└── 4.6 RouterAccessibilityService.onDestroy()
```

---

## 8. State Machine Transitions

### 8.1 Daemon State Machine

```
                    ┌─────────────┐
                    │  INSTALLED  │ (Fresh install, no permissions)
                    └──────┬──────┘
                           │ User enables Accessibility in Settings
                           ▼
                    ┌─────────────┐
                    │  INITIALIZING│ (AppInitializer running)
                    └──────┬──────┘
                           │ Channels/DB/Keystore ready
                           ▼
                    ┌─────────────┐
                    │  PENDING    │ (Waiting for MediaProjection grant)
                    └──────┬──────┘
                           │ User grants projection (or token cached)
                           ▼
                    ┌─────────────┐
                    │  STARTING   │ (HeadlessBootSequence)
                    └──────┬──────┘
                           │ All subsystems started
                           ▼
              ┌─────────────────────────┐
              │       RUNNING           │◄──────────────────────┐
              │  (Steady state, active) │                       │
              └────────┬────────────────┘                       │
                       │                                        │
          ┌────────────┼────────────┐                            │
          ▼            ▼            ▼                            │
    ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
    │ SAFE_MODE│ │ RECOVERING│ │ CRASHED  │                      │
    │(Limited) │ │(Retrying)│ │(Stopped) │                      │
    └────┬─────┘ └────┬─────┘ └────┬─────┘                      │
         │            │            │                              │
         │ Recovery   │ Success    │ Manual restart               │
         └────────────┴────────────┴──────────────────────────────┘
```

### 8.2 Route State Machine

```
┌─────────────┐     Sensor detects      ┌──────────────┐
│  UNKNOWN    │ ──────────────────────► │ HEADSET_LOCK │
│ (Initial)   │ ◄────────────────────── │ (Phantom jack│
└──────┬──────┘     Correction fails    │  detected)   │
       │                                 └──────┬───────┘
       │ SpeakerForceEngine                     │
       │ forces route                           │ setSpeakerphoneOn(true)
       ▼                                        ▼
┌─────────────┐                          ┌──────────────┐
│SPEAKER_FORCED│◄────────────────────────│  DRIFTING    │
│ (Active)    │  Correction succeeds     │(System fights│
└──────┬──────┘                          │  back)       │
       │                                  └──────────────┘
       │ System overrides (call/alarm)
       ▼
┌─────────────┐
│  YIELDED    │
│(Focus lost) │
└─────────────┘
```

### 8.3 Capture State Machine

```
┌─────────────┐     Token granted       ┌──────────────┐
│  IDLE       │ ──────────────────────► │   ACTIVE     │
│ (No media)  │ ◄────────────────────── │(Capturing PCM│
└──────┬──────┘     Silence >30s        │  to buffer)  │
       │                                 └──────┬───────┘
       │                                        │
       │                                        │ Token revoked
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │   REVOKED    │
       │                                 │(Token lost)  │
       │                                 └──────┬───────┘
       │                                        │
       │                                        │ Buffer empty >5s
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │   STARVED    │
       │                                 │(No data)     │
       │                                 └──────┬───────┘
       │                                        │
       │                                        │ App blocks capture
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │   BLOCKED    │
       │                                 │(DRM/Privacy) │
       │                                 └──────────────┘
```

### 8.4 Update State Machine

```
┌─────────────┐     Server has newer    ┌──────────────┐
│ NOT_CHECKED │ ──────────────────────► │  AVAILABLE   │
│ (Initial)   │ ◄────────────────────── │(Notification │
└──────┬──────┘     No update found     │  shown)      │
       │                                 └──────┬───────┘
       │                                        │ User taps Download
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │ DOWNLOADING  │
       │                                 │(Foreground    │
       │                                 │ service)      │
       │                                 └──────┬───────┘
       │                                        │ Download complete
       │                                        │ Checksum verified
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │  DOWNLOADED  │
       │                                 │(APK in cache) │
       │                                 └──────┬───────┘
       │                                        │ User confirms install
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │ INSTALLING   │
       │                                 │(System dialog)│
       │                                 └──────┬───────┘
       │                                        │ Install success
       │                                        ▼
       │                                 ┌──────────────┐
       │                                 │   SUCCESS    │
       │                                 │(App restarted)│
       │                                 └──────────────┘
       │
       │ Any failure
       ▼
┌─────────────┐
│   FAILED    │
│(Retry logic)│
└─────────────┘
```

---

## 9. Critical API Usage Summary

### 9.1 Android 13 Mandatory APIs

| API | Used By | Purpose | Consequence if Missing |
|-----|---------|---------|------------------------|
| `foregroundServiceType="mediaPlayback"` | PersistentAudioService | Required for A13 foreground service | `MissingForegroundServiceTypeException` |
| `foregroundServiceType="dataSync"` | UpdateDownloadService | Required for background APK downloads | Download service killed by system |
| `POST_NOTIFICATIONS` permission | NotificationChannelManager | Required for A13 notifications | Notification silently dropped |
| `MediaProjection` API | MediaProjectionCaptureSession | Captures system audio mix | Cannot bypass app-level audio blocks |
| `AccessibilityService` | RouterAccessibilityService | Daemon entrypoint, UI monitoring | Cannot automate permissions or detect crashes |
| `UsageStatsManager` | AppLaunchObserver | Detects app launches | Cannot correlate launches with crashes |
| `ApplicationExitInfo` | SoftRebootTracker | Detects process death reasons | Cannot distinguish SYSTEM_DIED from APP_BUG |
| `AudioPlaybackCapture` | PlaybackCaptureEngine | Captures other apps' audio | Requires MediaProjection token |
| `AudioAttributes.USAGE_VOICE_COMMUNICATION` | SpeakerPlaybackEngine | Forces speaker routing | Audio routed to phantom headset |
| `REQUEST_INSTALL_PACKAGES` | UpdateInstaller | Allows APK installation | System blocks install intent |
| `SYSTEM_ALERT_WINDOW` | OverlayShortcutController | Draws floating toggle | Overlay cannot be created |
| `FileProvider` | CrashSnapshotExporter, UpdateInstaller | Secure file sharing | FileUriExposedException |

### 9.2 Audio Manager API Sequence

```kotlin
// CORRECT sequence (must be in this order):
1. audioManager.mode = MODE_IN_COMMUNICATION
2. audioManager.isSpeakerphoneOn = true
3. audioTrack = AudioTrack.Builder()
       .setAudioAttributes(
           AudioAttributes.Builder()
               .setUsage(USAGE_VOICE_COMMUNICATION)
               .setContentType(CONTENT_TYPE_SPEECH)
               .build()
       )
       .setAudioFormat(...)
       .setTransferMode(MODE_STREAM)
       .setBufferSizeInBytes(...)
       .build()
4. audioTrack.play()

// WRONG sequence (will fail on Unisoc/Nokia):
// Setting speakerphoneOn BEFORE mode = COMMUNICATION -> System ignores it
// Using USAGE_MEDIA instead of USAGE_VOICE_COMMUNICATION -> Routes to headset
// Not calling play() after build() -> AudioTrack underruns immediately
```

### 9.3 Update API Sequence

```kotlin
// CORRECT update flow:
1. UpdateChecker.pollServer() -> GET /api/v1/version
2. Compare versionCode > BuildConfig.VERSION_CODE
3. UpdateNotificationHandler.showAvailable()
4. User taps "Download" -> UpdateDownloader.startForeground()
5. Download APK to context.cacheDir/updates/
6. Verify SHA-256 checksum matches server response
7. UpdateInstaller.triggerInstall() -> ACTION_INSTALL_PACKAGE
8. FileProvider.getUriForFile() -> content:// URI
9. System shows "Install this update?" dialog
10. User confirms -> APK installed, app restarts
11. BootStateRestorer.restoreFromSnapshot()

// WRONG sequence (will fail on A13):
// Attempting install without REQUEST_INSTALL_PACKAGES -> SecurityException
// Using file:// URI instead of content:// -> FileUriExposedException
// Skipping checksum verification -> Risk of corrupted/tampered APK
// Auto-installing without user confirmation -> Not possible on A13
```

---

## 10. File Cross-Reference Index

| Subsystem | Key Files | Dependencies | Failure Impact |
|-----------|-----------|--------------|----------------|
| **Bootstrap** | VyzorixAppInitializer, BootstrapCoordinator, LauncherIconHider, BootStateRestorer | NotificationChannelManager, DaemonDatabase, KeystoreManager | Entire daemon fails to start or icon not hidden |
| **Accessibility** | RouterAccessibilityService, AccessibilityEventRouter, UiRecoveryDaemon, AccessibilityRecoveryHandler | PermissionScreenWatcher, SettingsAutomation, OverlayShortcutController | No crash detection, no permission automation, no recovery |
| **Audio Routing** | SpeakerForceEngine, AudioRouteWatcher, SpeakerForceManager | NokiaC22DeviceProfile, AudioRouteManager | Audio routes to broken headset jack |
| **Capture** | MediaProjectionCaptureSession, PlaybackCaptureEngine, ProjectionTokenManager | AudioCaptureConfig, TokenPersistence | No audio capture, silent pipeline |
| **Playback** | SpeakerPlaybackEngine, AudioTrackController, LatencyOptimizer | AudioTrackFactory, UnderrunRecovery | Audio stuttering, crackling, or silence |
| **Native** | NativeAudioBridge, NativeLoader, AudioPipelineController | C++ ring buffer, PCM mixer | Falls back to Java-only (higher latency) |
| **Diagnostics** | AppLaunchObserver, SoftRebootPredictor, RendererFailureDetector | LogStreamCollector, RollingLogWriter | Cannot diagnose crash causes |
| **Monitoring** | DaemonWatchdog, ProcessHealthMonitor, DeviceThermalMonitor | PipelineHealthChecker, CrashLoopProtector | Silent failures go undetected |
| **Dashboard** | ServiceNotificationDashboard, NotificationCompatBridge | DaemonStatusProvider, RemoteViews layouts | User cannot see daemon status |
| **Storage** | LogFileRotator, CrashSnapshotExporter, StateRepository | DaemonDatabase, FileProvider | Diagnostic data lost on crash |
| **Recovery** | RecoveryOrchestrator, ServiceRecoveryManager, WatchdogEscalationPolicy | CrashLoopProtector, StartupBackoffScheduler | Single failure becomes permanent |
| **Updates** | UpdateChecker, UpdateDownloader, UpdateInstaller | UpdateConfig, NetworkStateMonitor, UpdateStateStore | No remote updates, manual APK install required |
| **Network** | NetworkStateMonitor, UpdateDownloadClient | ConnectivityManager, OkHttp | Update checks fail silently |
| **Overlay** | OverlayShortcutController, OverlayPermissionManager | WindowManager, SYSTEM_ALERT_WINDOW | No floating toggle button |

---

## 11. Permission Matrix

| Permission | Type | Grant Method | Used By | Critical? |
|------------|------|--------------|---------|-----------|
| `BIND_ACCESSIBILITY_SERVICE` | Signature | System grants on enable | RouterAccessibilityService | YES |
| `POST_NOTIFICATIONS` | Runtime | Auto-granted on Accessibility enable | NotificationChannelManager | YES |
| `FOREGROUND_SERVICE` | Manifest | Auto-granted on install | PersistentAudioService | YES |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Manifest | Auto-granted on install | PersistentAudioService | YES |
| `FOREGROUND_SERVICE_DATA_SYNC` | Manifest | Auto-granted on install | UpdateDownloadService | NO |
| `RECEIVE_BOOT_COMPLETED` | Manifest | Auto-granted on install | BootReceiver | YES |
| `MODIFY_AUDIO_SETTINGS` | Manifest | Auto-granted on install | AudioFocusHandler, SpeakerForceEngine | YES |
| `INTERNET` | Manifest | Auto-granted on install | UpdateChecker, NetworkStateMonitor | NO |
| `ACCESS_NETWORK_STATE` | Manifest | Auto-granted on install | NetworkStateMonitor | NO |
| `REQUEST_INSTALL_PACKAGES` | Special | User grants in Settings | UpdateInstaller | NO |
| `SYSTEM_ALERT_WINDOW` | Special | User grants via overlay prompt | OverlayShortcutController | NO |
| `QUERY_ALL_PACKAGES` | Special | User grants via Play Console | AppLaunchObserver (UsageStats) | NO |
| `PACKAGE_USAGE_STATS` | Special | User grants in Settings | AppLaunchObserver | NO |

---

This document serves as the architectural reference for VyzorixAudioRouter. All subsequent implementation should cross-check against this map to ensure component consistency, proper lifecycle ordering, and correct failure handling.

👇👇👇

# NOTIFICATION_DASHBOARD.md — Read-Only Status Interface

## Objective
Provide a persistent, read-only status dashboard for the VyzorixAudioRouter daemon via the Android notification bar. This interface must display all critical system health, routing, and diagnostic information without launching any Activity or UI component that could trigger a soft reboot on the Nokia C22.

## Design Constraints
1.  **Zero Interaction:** Tapping the notification, the chevron, or any element within it must NOT open the app.
2.  **System UI Rendering:** The dashboard is drawn by `com.android.systemui`, isolating it from the app's Zygote crash issues.
3.  **Height Limitation:** Android imposes a maximum height on expanded notifications (~256dp to ~400dp depending on OEM/Version). Content exceeding this limit will be clipped unless a scrolling or cycling strategy is used.
4.  **Real-Time Updates:** Status must refresh automatically (every 10 seconds) without user input.

---

## Architecture: The "Heads-Up Dashboard"

### 1. Notification Style
We use `NotificationCompat.DecoratedCustomViewStyle()`. This allows us to replace the standard notification body with a custom `RemoteViews` layout while keeping the system header (Icon, Title, Time, and the Expand/Collapse Chevron).

### 2. RemoteViews Implementation
The layout is defined in XML but rendered remotely by the System UI process.
- **Supported Widgets:** `TextView`, `ProgressBar`, `ImageView`, `LinearLayout`, `RelativeLayout`, `FrameLayout`, `Chronometer`, `ScrollView` (with caveats), `ViewFlipper` (via animation).
- **Unsupported Widgets:** `Button`, `Switch`, `EditText`, `RecyclerView` (unless using specialized APIs not suitable here), Custom Views.

### 3. Layout Structure

The dashboard is divided into three priority tiers:

| Tier | Content | Visibility |
|------|---------|------------|
| **Tier 1** | Route Status (Mode, Speaker, Headset) | Always visible in collapsed/expanded state |
| **Tier 2** | Capture Engine (Projection, Buffer, Sample Rate) | Always visible in expanded state |
| **Tier 3** | System Health (Risk Score, Uptime, Thermal, Reboots) | Visible via scrolling or auto-cycling in expanded state |

---

## Scrolling & Overflow Strategy

Android's `ScrollView` inside `RemoteViews` is supported but **clipped** at the system's max notification height. To guarantee visibility of all data without interaction, we implement a **Hybrid Scrolling Approach**:

### Strategy A: Native ScrollView (Preferred)
We wrap the Tier 3 content in a `<ScrollView>` within the `RemoteViews`.
```xml
<ScrollView
    android:id="@+id/dashboard_scroll"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:fillViewport="true">
    
    <LinearLayout
        android:orientation="vertical"
        android:padding="8dp">
        <!-- Tier 3 Status Items -->
        <include layout="@layout/notification_section_health" />
        <include layout="@layout/notification_section_diagnostics" />
        <include layout="@layout/notification_section_oem_quirks" />
    </LinearLayout>
</ScrollView>
```
**Behavior:** The user can swipe up/down within the notification area to scroll.
**Limitation:** Some OEM skins (like Nokia's stock Android) may restrict touch gestures inside notifications or clip the scrollable area.

### Strategy B: Auto-Cycling Carousel (Fallback)
If scrolling is unreliable or the user prefers "set and forget" monitoring, we implement an **Auto-Cycling View** using `ViewSwitcher` or `ViewFlipper` logic driven by the background update loop.

```kotlin
// Pseudo-logic for Cycling
var currentViewIndex = 0
val views = listOf(view_health, view_diagnostics, view_oem)

scheduler.scheduleAtFixedRate({
    currentViewIndex = (currentViewIndex + 1) % views.size
    updateNotificationWithView(views[currentViewIndex])
}, 0, 5, TimeUnit.SECONDS) // Cycles every 5 seconds
```
**Behavior:** The notification body automatically rotates through different status sections every 5 seconds.
**Advantage:** Works on all devices, no touch gestures required, guarantees all data is seen over time.

### Strategy C: Marquee Text
For single-line fields that are too long (e.g., "Last Crash: com.example.app caused Zygote death at 14:30"), we enable Android's built-in marquee:
```xml
<TextView
    android:id="@+id/txt_last_crash"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:ellipsize="marquee"
    android:marqueeRepeatLimit="marquee_forever"
    android:singleLine="true"
    android:text="..." />
```

---

## Implementation Details

### 1. Non-Clickable Enforcement
To ensure the notification is **strictly read-only** and does not trigger app launches:

**A. Null ContentIntent**
```kotlin
val builder = NotificationCompat.Builder(context, CHANNEL_ID)
    .setContentTitle("VyzorixAudioRouter")
    .setContentIntent(null) // Prevents tap-to-open
    .setOngoing(true)       // Prevents swipe-to-dismiss
    ...
```

**B. No-Op PendingIntent (Compatibility)**
Some Android versions require a non-null `ContentIntent`. In this case, we attach a broadcast that performs no action:
```kotlin
val noOpIntent = Intent("com.vyzorix.audiorouter.ACTION_NO_OP")
val noOpPending = PendingIntent.getBroadcast(
    context, 0, noOpIntent,
    PendingIntent.FLAG_IMMUTABLE
)
builder.setContentIntent(noOpPending)
```

**C. Disable Clickable Children**
All `TextView` and `ProgressBar` elements in the `RemoteViews` layout are configured with:
```xml
android:clickable="false"
android:focusable="false"
android:longClickable="false"
```

### 2. Background Update Mechanism
The dashboard is updated by a coroutine loop running inside `PersistentAudioService`:

```kotlin
// In PersistentAudioService.kt
private fun startDashboardUpdates() {
    lifecycleScope.launch {
        while (isActive) {
            val status = DaemonStatusProvider.gatherCurrentStatus()
            val views = buildRemoteViews(status)
            notificationManager.notify(DASHBOARD_ID, buildNotification(views))
            delay(10_000L) // Update every 10 seconds
        }
    }
}
```

**Data Gathering:**
`DaemonStatusProvider` collects real-time data from:
- `AudioRouteWatcher` (Route state)
- `PlaybackCaptureEngine` (Buffer health, sample rate)
- `SoftRebootPredictor` (Risk score, uptime, reboot count)
- `DeviceThermalMonitor` (Temperature state)
- `LastKnownStateDumper` (Last crash context)

### 3. Visual State Indicators
Since the notification cannot use complex colors or icons (to save space and battery), we use **Text-Based State Markers**:

| State | Indicator | Example |
|-------|-----------|---------|
| Normal | `[OK]` | `Speaker: FORCED [OK]` |
| Warning | `[!!]` | `Risk Score: 65/100 [!!]` |
| Critical | `[XX]` | `Capture: STARVED [XX]` |
| Idle | `[--]` | `Reboots: 0 [--]` |

**Color Coding (If Supported):**
On Android 13+, `RemoteViews` supports `TextView.setTextColor()`. We apply subtle color coding:
- Green (`#4CAF50`): Normal
- Yellow (`#FFC107`): Warning
- Red (`#F44336`): Critical
- Gray (`#9E9E9E`): Idle/Unknown

---

## Layout Blueprint (XML Concept)

```xml
<!-- res/layout/notification_dashboard_expanded.xml -->
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:orientation="vertical"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:padding="12dp">

    <!-- TIER 1: ROUTE STATUS -->
    <TextView
        android:id="@+id/txt_route_title"
        android:text="ROUTING ENGINE"
        android:textStyle="bold" />
    <TextView android:id="@+id/txt_route_mode" />
    <TextView android:id="@+id/txt_speaker_state" />
    <TextView android:id="@+id/txt_headset_state" />
    <TextView android:id="@+id/txt_audiotrack_usage" />

    <View android:layout_height="1dp" android:background="#333" />

    <!-- TIER 2: CAPTURE ENGINE -->
    <TextView
        android:id="@+id/txt_capture_title"
        android:text="MEDIA CAPTURE"
        android:textStyle="bold" />
    <TextView android:id="@+id/txt_projection_token" />
    <TextView android:id="@+id/txt_buffer_health" />
    <TextView android:id="@+id/txt_sample_rate" />
    <TextView android:id="@+id/txt_underruns" />

    <View android:layout_height="1dp" android:background="#333" />

    <!-- TIER 3: SYSTEM HEALTH (Scrollable/Cycling) -->
    <ScrollView
        android:id="@+id/dashboard_scroll"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        
        <LinearLayout
            android:orientation="vertical"
            android:paddingBottom="8dp">
            
            <TextView
                android:id="@+id/txt_health_title"
                android:text="SYSTEM HEALTH"
                android:textStyle="bold" />
            <TextView android:id="@+id/txt_risk_score" />
            <TextView android:id="@+id/txt_uptime" />
            <TextView android:id="@+id/txt_reboots_1h" />
            <TextView android:id="@+id/txt_thermal" />
            <TextView android:id="@+id/txt_safe_mode" />
            <TextView android:id="@+id/txt_last_crash" 
                      android:ellipsize="marquee" 
                      android:marqueeRepeatLimit="marquee_forever" />
        </LinearLayout>
    </ScrollView>
</LinearLayout>
```

---

## Edge Case Handling

### 1. Notification Clipping (OEM Limits)
Some devices enforce a hard max height (e.g., 256dp). If content is clipped:
- **Solution:** The `ScrollView` allows vertical dragging to see hidden content.
- **Fallback:** If scrolling is blocked, the background update loop switches to **Strategy B (Auto-Cycling)** automatically after detecting no scroll events for 10 seconds.

### 2. System UI Crash / Restart
If `com.android.systemui` crashes (rare but possible during a soft reboot):
- The notification disappears temporarily.
- `ServiceRecoveryManager` detects the loss via `NotificationManager.getActiveNotifications()`.
- It re-posts the notification within 2 seconds.

### 3. "Safe Mode" Activation
If `SoftRebootPredictor` raises the Risk Score > 75:
- The dashboard switches to a **Minimal View**.
- Non-critical sections (Capture, Diagnostics, OEM) are hidden.
- Only Tier 1 (Route) and a "SAFE MODE ACTIVE" warning are shown to conserve resources.

### 4. Thermal Throttling
If `DeviceThermalMonitor` detects high temperature:
- The dashboard adds a `[HOT]` indicator next to the Thermal status.
- The update frequency drops from 10s to 30s to reduce CPU load.
- A warning text is appended: "Thermal limit reached. Reducing logging."

---

## On-Device Verification (No PC Required)

Since the dashboard is the primary monitoring tool, users can verify system health using these methods:

### Method 1: The "Chevron Pull" Test
1. Pull down the notification shade.
2. Expand the `VyzorixAudioRouter` notification by tapping the chevron.
3. Verify:
   - All text fields are populated (no "--" unless truly unknown).
   - The ScrollView works (swipe up/down to see Tier 3).
   - No "Open App" prompt appears when tapping anywhere.

### Method 2: Audio Feedback Cross-Check
1. Play a YouTube video.
2. Observe the dashboard:
   - `Capture` should show "ACTIVE" and buffer health > 0%.
   - `Speaker` should show "FORCED [OK]".
3. If audio plays through speaker and dashboard confirms, the pipeline is fully functional.

### Method 3: Risk Score Monitoring
1. Open a "known bad" app (one that triggers soft reboots).
2. Watch the `Risk Score` field on the dashboard.
3. If it climbs past 50, the system is detecting instability.
4. If the dashboard disappears and reappears after a few seconds, a soft reboot occurred and the daemon recovered.

### Method 4: Manual Refresh Trigger
1. Tap the notification (configured as no-op broadcast).
2. The broadcast receiver forces an immediate status refresh and updates the notification content.
3. Verify the timestamp/uptime updates without launching the app.

---

## Summary

The Notification Dashboard provides a **safe, persistent, and comprehensive** view of the daemon's health without risking system crashes. By using `RemoteViews` with a hybrid scrolling/cycling strategy, we bypass Android's height limitations. By disabling all `PendingIntent` triggers, we ensure the dashboard is strictly read-only. This is the primary diagnostic and monitoring interface for the Nokia C22 "Route War" and "Soft Reboot" mitigation strategies.


👇👇👇

# UPDATE_MECHANISM.md — Cloud Update System Architecture

## Objective
Enable the VyzorixAudioRouter daemon to check for, download, and install APK updates from a remote Render backend server, without requiring user interaction beyond a single install confirmation (mandated by Android 13 security).

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPER WORKSTATION                      │
│  - Builds release APK via ./gradlew assembleRelease          │
│  - Signs APK with release keystore                            │
│  - Pushes to GitHub with semantic version tag (v2.1.0)        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS (CI/CD)                       │
│  Trigger: git tag push (v*)                                  │
│  Workflow: push_update_bin.yml                               │
│  Steps:                                                      │
│    1. Build release APK                                      │
│    2. Compute SHA-256 checksum                               │
│    3. Create version.json metadata                           │
│    4. Push APK to server repo /bin/ folder                   │
│    5. Push version.json to server repo /api/v1/version       │
│    6. Deploy to Render (auto-triggered on repo push)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     RENDER BACKEND SERVER                     │
│  - Static file server (nginx/Express)                        │
│  - Serves:                                                   │
│      GET /api/v1/version    -> version.json                  │
│      GET /api/v1/changelog  -> changelog.json                │
│      GET /bin/audiorouter-v2.1.0.apk -> APK binary           │
│  - CORS configured for app domain                            │
│  - HTTPS enforced (TLS 1.2+)                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  VYZORIX AUDIO ROUTER (DAEMON)                │
│  - NetworkStateMonitor detects internet connectivity         │
│  - UpdateChecker polls /api/v1/version on schedule           │
│  - Compares remote version vs local BuildConfig.VERSION_CODE  │
│  - If update available:                                      │
│      1. Shows "Update available" notification                │
│      2. User taps notification                               │
│      3. UpdateDownloader starts foreground download service   │
│      4. Downloads APK to cacheDir/updates/                   │
│      5. Verifies SHA-256 checksum                            │
│      6. UpdateInstaller triggers ACTION_INSTALL_PACKAGE       │
│      7. System shows "Install this update?" dialog           │
│      8. User confirms -> APK installed                       │
│      9. Daemon restarts with new version                     │
│     10. BootStateRestorer resumes from last known state      │
└─────────────────────────────────────────────────────────────┘
```

---

## Server API Contract

### 1. Version Check Endpoint

**Request:**
```
GET https://your-render-domain.com/api/v1/version
Headers:
  Accept: application/json
  X-App-Version: 2.0.0
  X-App-Build: 38
  X-Device-Model: Nokia C22
  X-Android-Version: 13
```

**Response (200 OK):**
```json
{
  "version": "2.1.0",
  "versionCode": 42,
  "buildNumber": 42,
  "minSdkVersion": 29,
  "releaseDate": "2024-05-24T10:00:00Z",
  "downloadUrl": "https://your-render-domain.com/bin/audiorouter-v2.1.0.apk",
  "checksumSha256": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "fileSize": 15728640,
  "releaseNotes": "Fixed speaker route drift on Nokia C22. Improved crash detection. Added overlay shortcut.",
  "forced": false,
  "changelog": [
    "Fixed: SpeakerForceEngine loop timing improved from 1000ms to 500ms",
    "Added: OverlayShortcutController for enable/disable toggle",
    "Added: UpdateChecker for remote version polling",
    "Improved: BootStateRestorer now preserves MediaProjection token across reboots"
  ]
}
```

**Response Fields:**
| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| version | String | YES | Semantic version string (e.g., "2.1.0") |
| versionCode | Int | YES | Android versionCode for comparison |
| buildNumber | Int | YES | Internal build number |
| minSdkVersion | Int | YES | Minimum Android SDK required |
| releaseDate | ISO8601 | YES | When this version was published |
| downloadUrl | String | YES | Direct link to APK binary |
| checksumSha256 | String | YES | SHA-256 hash of APK for verification |
| fileSize | Long | YES | APK file size in bytes |
| releaseNotes | String | NO | User-friendly summary |
| forced | Boolean | NO | If true, update is mandatory (no dismiss) |
| changelog | Array | NO | Detailed list of changes |

### 2. Changelog Endpoint

**Request:**
```
GET https://your-render-domain.com/api/v1/changelog
Headers:
  Accept: application/json
```

**Response (200 OK):**
```json
{
  "versions": [
    {
      "version": "2.1.0",
      "versionCode": 42,
      "releaseDate": "2024-05-24T10:00:00Z",
      "changes": [
        "Fixed: SpeakerForceEngine loop timing",
        "Added: OverlayShortcutController"
      ]
    },
    {
      "version": "2.0.0",
      "versionCode": 38,
      "releaseDate": "2024-05-10T08:00:00Z",
      "changes": [
        "Initial release with speaker routing"
      ]
    }
  ]
}
```

### 3. APK Binary Endpoint

**Request:**
```
GET https://your-render-domain.com/bin/audiorouter-v2.1.0.apk
Headers:
  Accept: application/vnd.android.package-archive
Range: bytes=0- (for resume support)
```

**Response (200 OK or 206 Partial Content):**
```
Content-Type: application/vnd.android.package-archive
Content-Length: 15728640
Content-Disposition: attachment; filename="audiorouter-v2.1.0.apk"
ETag: "a1b2c3d4e5f67890..."
Accept-Ranges: bytes
```

**Response (404 Not Found):**
```json
{ "error": "APK not found", "version": "2.1.0" }
```

---

## GitHub Actions Workflow

### `.github/workflows/push_update_bin.yml`

```yaml
name: Build and Push Update Binary

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Decode keystore
        run: |
          echo "${{ secrets.RELEASE_KEYSTORE_BASE64 }}" | base64 --decode > release.keystore

      - name: Build release APK
        run: |
          chmod +x gradlew
          ./gradlew assembleRelease \
            -Pandroid.injected.signing.store.file=release.keystore \
            -Pandroid.injected.signing.store.password=${{ secrets.KEYSTORE_PASSWORD }} \
            -Pandroid.injected.signing.key.alias=${{ secrets.KEY_ALIAS }} \
            -Pandroid.injected.signing.key.password=${{ secrets.KEY_PASSWORD }}

      - name: Extract version info
        id: version
        run: |
          VERSION_NAME=$(grep -oP 'versionName\s*=\s*"\K[^"]+' app/build.gradle.kts)
          VERSION_CODE=$(grep -oP 'versionCode\s*=\s*\K\d+' app/build.gradle.kts)
          echo "version_name=$VERSION_NAME" >> $GITHUB_OUTPUT
          echo "version_code=$VERSION_CODE" >> $GITHUB_OUTPUT

      - name: Compute SHA-256 checksum
        run: |
          sha256sum app/release/audiorouter-v${{ steps.version.outputs.version_name }}.apk > checksum.txt

      - name: Create version.json
        run: |
          cat > version.json << EOF
          {
            "version": "${{ steps.version.outputs.version_name }}",
            "versionCode": ${{ steps.version.outputs.version_code }},
            "buildNumber": ${{ steps.version.outputs.version_code }},
            "minSdkVersion": 29,
            "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "downloadUrl": "https://your-render-domain.com/bin/audiorouter-v${{ steps.version.outputs.version_name }}.apk",
            "checksumSha256": "$(cut -d' ' -f1 checksum.txt)",
            "fileSize": $(stat -c%s app/release/audiorouter-v${{ steps.version.outputs.version_name }}.apk),
            "releaseNotes": "Version ${{ steps.version.outputs.version_name }} release",
            "forced": false,
            "changelog": []
          }
          EOF

      - name: Push to server repository
        uses: cpina/github-action-push-to-another-repository@main
        env:
          API_TOKEN_GITHUB: ${{ secrets.SERVER_REPO_TOKEN }}
        with:
          source-directory: '.'
          destination-github-username: 'your-username'
          destination-repository-name: 'vyzorix-update-server'
          user-email: 'bot@vyzorix.com'
          commit-message: 'Release v${{ steps.version.outputs.version_name }}'
          target-branch: 'main'

      - name: Trigger Render deploy
        run: |
          curl -X POST "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json"
```

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `RELEASE_KEYSTORE_BASE64` | Base64-encoded release keystore file |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias name |
| `KEY_PASSWORD` | Key password |
| `SERVER_REPO_TOKEN` | GitHub token with push access to server repo |
| `RENDER_SERVICE_ID` | Render service ID for deployment trigger |
| `RENDER_API_KEY` | Render API key for deployment trigger |

---

## Render Server Setup

### Project Structure (Server Repository)

```
vyzorix-update-server/
├── bin/
│   ├── audiorouter-v2.0.0.apk
│   ├── audiorouter-v2.1.0.apk
│   └── audiorouter-v2.2.0.apk          # New APKs added by GitHub Actions
├── api/
│   └── v1/
│       ├── version.json                 # Updated by GitHub Actions
│       └── changelog.json               # Updated by GitHub Actions
├── public/
│   └── index.html                       # Simple landing page (optional)
├── package.json                         # Express.js dependencies
├── server.js                            # Express server
├── nginx.conf                           # Nginx configuration
└── Dockerfile                           # Container definition
```

### Express.js Server (server.js)

```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['android-app://com.vyzorix.audiorouter'],
  methods: ['GET', 'HEAD'],
  allowedHeaders: ['Accept', 'X-App-Version', 'X-App-Build', 'Range']
}));

// Serve static files (APK binaries)
app.use('/bin', express.static(path.join(__dirname, 'bin'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Version check endpoint
app.get('/api/v1/version', (req, res) => {
  const versionPath = path.join(__dirname, 'api', 'v1', 'version.json');
  if (fs.existsSync(versionPath)) {
    const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    res.json(version);
  } else {
    res.status(404).json({ error: 'Version info not found' });
  }
});

// Changelog endpoint
app.get('/api/v1/changelog', (req, res) => {
  const changelogPath = path.join(__dirname, 'api', 'v1', 'changelog.json');
  if (fs.existsSync(changelogPath)) {
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    res.json(changelog);
  } else {
    res.status(404).json({ error: 'Changelog not found' });
  }
});

// APK download endpoint with range support (resume)
app.get('/bin/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'bin', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'APK not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Range request (resume support)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'application/vnd.android.package-archive'
    });
    file.pipe(res);
  } else {
    // Full download
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'application/vnd.android.package-archive',
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Update server running on port ${PORT}`);
});
```

### Render Deployment Configuration

**render.yaml:**
```yaml
services:
  - type: web
    name: vyxorix-update-server
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
    healthCheckPath: /health
    autoDeploy: true
```

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Update Flow (Detailed Daemon Side)

### Phase 1: Network Detection
1. `NetworkStateMonitor` registers `ConnectivityManager.NetworkCallback`
2. On network available: Pings DNS (8.8.8.8:53) to verify internet reachability
3. Checks if connection is WiFi or Cellular (affects download policy)
4. If WiFi or cellular allowed: Proceeds to Phase 2
5. If cellular blocked: Waits for WiFi connection

### Phase 2: Version Check
1. `UpdateChecker` fires on schedule (default: every 6 hours, configurable in `AppConfig`)
2. Makes GET request to `/api/v1/version` with headers:
   - `X-App-Version: BuildConfig.VERSION_NAME`
   - `X-App-Build: BuildConfig.VERSION_CODE`
   - `X-Device-Model: Build.MODEL`
   - `X-Android-Version: Build.VERSION.RELEASE`
3. Parses JSON response
4. Compares `response.versionCode` > `BuildConfig.VERSION_CODE`
5. If update available: Proceeds to Phase 3
6. If no update: Logs "Up to date", schedules next check

### Phase 3: User Notification
1. `UpdateNotificationHandler` posts notification:
   - Title: "Update available: v{remoteVersion}"
   - Body: "{releaseNotes}"
   - Actions: [Download] [Dismiss]
   - Tapping notification triggers `UpdateDownloader.startForeground()`
2. If `forced == true`: No dismiss button, notification persistent

### Phase 4: APK Download
1. `UpdateDownloader` starts `UpdateDownloadService` (foreground, type=dataSync)
2. Downloads APK to `context.cacheDir/updates/audiorouter-v{version}.apk`
3. Shows progress notification (0% -> 100%)
4. Supports resume on network interruption (Range header)
5. On completion: Verifies SHA-256 checksum matches server response
6. If checksum mismatch: Deletes file, logs error, retries up to 3 times
7. If checksum match: Marks state as DOWNLOADED

### Phase 5: Installation
1. `UpdateInstaller` creates `Intent.ACTION_INSTALL_PACKAGE`
2. Uses `FileProvider` to generate `content://` URI for APK
3. Adds flags: `FLAG_GRANT_READ_URI_PERMISSION`, `FLAG_ACTIVITY_NEW_TASK`
4. Starts intent -> System shows "Install this update?" dialog
5. User taps "Install"
6. System verifies APK signature (must match existing app signature)
7. System installs APK, preserving app data
8. System restarts app process
9. `BootStateRestorer` detects restart, resumes from `LastKnownStateDumper` snapshot
10. Daemon returns to RUNNING state

### Phase 6: Post-Install Verification
1. `UpdateStateStore` marks install as SUCCESS
2. `UpdateChecker` polls server again to confirm no newer version
3. Dashboard notification shows: "Updated to v{newVersion}"
4. Old APK files in cacheDir deleted

---

## Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| No internet | NetworkStateMonitor ping fails | Schedule retry in 30 minutes |
| Server unreachable | HTTP timeout after 15 seconds | Schedule retry in 1 hour, exponential backoff |
| Version check fails | Non-200 response | Log error, schedule retry in 6 hours |
| Download interrupted | IOException during stream | Resume via Range header, retry up to 3 times |
| Checksum mismatch | SHA-256 doesn't match server value | Delete file, log warning, retry download |
| Install rejected | PackageManager.INSTALL_FAILED_* | Log error code, notify user, do not retry |
| Signature mismatch | INSTALL_FAILED_UPDATE_INCOMPATIBLE | Uninstall old version, clean install |
| Storage full | IOException: ENOSPC | Delete old cache files, notify user |
| Permission denied | SecurityException on install | Prompt user to enable "Install unknown apps" |

---

## Security Considerations

### 1. APK Signature Verification
- Android enforces that update APK must be signed with the **same certificate** as the installed app
- If signatures don't match: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
- No workaround possible on stock Android (security feature)

### 2. HTTPS Enforcement
- `network_security_config.xml` blocks all cleartext (HTTP) traffic
- Only HTTPS connections to Render backend allowed
- Certificate pinning optional (recommended for production)

### 3. SHA-256 Checksum Verification
- Server provides checksum in `version.json`
- App computes checksum of downloaded APK
- Mismatch = corrupted or tampered download = delete and retry
- Prevents man-in-the-middle APK substitution attacks

### 4. FileProvider Security
- APK stored in `cacheDir/updates/` (private to app)
- FileProvider grants temporary read-only URI permission to PackageInstaller
- URI expires after install completes
- APK deleted after successful install

### 5. REQUEST_INSTALL_PACKAGES Permission
- User must manually grant "Install unknown apps" permission in Settings
- Cannot be requested programmatically (must open system settings)
- Once granted, persists across reboots
- App should check this permission before attempting install

---

## Configuration Options

### `UpdateConfig.kt` Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `CHECK_INTERVAL_HOURS` | 6 | How often to poll server for updates |
| `DOWNLOAD_TIMEOUT_SECONDS` | 300 | Max time for APK download |
| `MAX_RETRY_ATTEMPTS` | 3 | Max retries for failed downloads |
| `ALLOW_CELLULAR_DOWNLOAD` | false | Only download on WiFi by default |
| `AUTO_INSTALL` | false | Always requires user confirmation |
| `FORCED_UPDATE_TIMEOUT_HOURS` | 24 | Time before forced update becomes mandatory |

### Override via `AppConfig.kt`

```kotlin
data class UpdateConfig(
    val checkIntervalHours: Long = 6,
    val downloadTimeoutSeconds: Long = 300,
    val maxRetryAttempts: Int = 3,
    val allowCellularDownload: Boolean = false,
    val autoInstall: Boolean = false,
    val forcedUpdateTimeoutHours: Long = 24,
    val serverBaseUrl: String = "https://your-render-domain.com",
    val versionEndpoint: String = "/api/v1/version",
    val changelogEndpoint: String = "/api/v1/changelog",
    val binPath: String = "/bin/"
)
```

---

## Testing the Update Flow

### Method 1: Local Server Testing
1. Run Express server locally: `node server.js`
2. Update `AppConfig.serverBaseUrl` to `http://10.0.2.2:3000` (emulator) or `http://<your-lan-ip>:3000` (device)
3. Place test APK in `bin/` folder
4. Update `version.json` with higher versionCode
5. Trigger update check from dashboard

### Method 2: Mock Server Testing
1. Use `MockWebServer` (OkHttp testing library)
2. Mock version response, changelog response, APK download
3. Test all error conditions (timeout, checksum mismatch, etc.)
4. Run via `DiagnosticTestRunner` on device

### Method 3: Production Testing
1. Deploy to Render
2. Push test APK to `bin/` folder
3. Update `version.json` with higher versionCode
4. Verify update notification appears on device
5. Test download, checksum verification, and install flow

---

## Summary

The update system is designed to be:
- **Safe:** SHA-256 verification, signature enforcement, HTTPS only
- **User-controlled:** No silent installs, explicit confirmation required
- **Resilient:** Resume support, retry logic, error recovery
- **Transparent:** Status visible in notification dashboard at all times
- **Compatible:** Works on stock Android 13 without root or special privileges
- **Automated:** GitHub Actions builds and deploys, Render serves, daemon checks and downloads

The only user interaction required is a single tap on the "Install" button in the system dialog. Everything else happens silently in the background.

🙂🙂🙂🙂
