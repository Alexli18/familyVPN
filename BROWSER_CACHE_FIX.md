# Fix Browser HSTS Cache Issue

## The Problem
Your browser has cached HSTS (HTTP Strict Transport Security) headers from a previous visit, forcing it to always use HTTPS for localhost:3000.

## Quick Solutions

### Option 1: Use a Different Port
```bash
PORT=3001 npm run dev
```
Then access: **http://localhost:3001**

### Option 2: Clear Browser HSTS Cache

#### Chrome:
1. Go to: `chrome://net-internals/#hsts`
2. In "Delete domain security policies" section
3. Enter: `localhost` and click "Delete"
4. Also delete: `127.0.0.1`

#### Firefox:
1. Go to: `about:config`
2. Search: `security.tls.insecure_fallback_hosts`
3. Add: `localhost,127.0.0.1`

#### Safari:
1. Safari > Preferences > Privacy
2. "Manage Website Data"
3. Remove localhost entries

### Option 3: Use Incognito/Private Mode
Open a private browsing window and try:
**http://localhost:3000**

### Option 4: Clear All Browser Data
- Chrome: Settings > Privacy > Clear browsing data > Advanced > "Site settings"
- Firefox: Settings > Privacy > Clear Data > "Site settings"
- Safari: Safari > Clear History > All History

## Test Commands
```bash
# Test if server is working (should return 200)
curl -I http://localhost:3000/login

# Test on different port
PORT=3001 npm run dev
curl -I http://localhost:3001/login
```

## Expected Result
You should see the Family VPN Server login page without any SSL errors.