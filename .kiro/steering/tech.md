# Technology Stack

## Core Technologies
- **Runtime**: Node.js (>=12.0.0)
- **Framework**: Express.js for web server
- **VPN Software**: OpenVPN
- **PKI Management**: Easy-RSA 3.x
- **Containerization**: Docker with docker-compose
- **Logging**: Winston

## Key Dependencies
- `express` - Web framework for management API
- `winston` - Structured logging
- `cross-spawn` - Cross-platform process spawning
- `fs-extra` - Enhanced filesystem operations
- `mkdirp` - Directory creation utility
- `which` - Cross-platform executable finder

## Development Dependencies
- `nodemon` - Development server with auto-reload

## Build System & Commands

### Setup Commands
```bash
npm run setup          # Interactive setup wizard for PKI and directories
npm run init-pki       # Initialize PKI infrastructure
npm run clean          # Clean generated certificates and configs
```

### Development Commands
```bash
npm start              # Start production server
npm run dev            # Start development server with nodemon
```

### Certificate Management
```bash
npm run generate-client    # Generate client certificates
npm run bundle-client      # Bundle client configuration
npm run fix-server-cert    # Regenerate server certificates
npm run test-easyrsa       # Test Easy-RSA functionality
```

### Docker Commands
```bash
docker-compose up -d       # Start containerized VPN server
docker-compose logs -f     # View container logs
docker-compose down        # Stop and remove containers
```

## Platform Support
- **macOS**: Native support with Homebrew dependencies
- **Linux**: Native support with package manager dependencies  
- **Windows**: Native support with manual OpenVPN installation
- **Docker**: Cross-platform containerized deployment

## Configuration
- Environment variables for paths and network settings
- Support for both system-wide (`/etc/openvpn`) and user-local (`~/.privatevpn`) installations
- Automatic `.env` file generation during setup