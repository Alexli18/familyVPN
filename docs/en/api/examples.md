# API Usage Examples

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [API](README.md) > Examples

🌐 **Language**: [English](../../en/api/examples.md) | [Русский](../../ru/api/examples.md)

## 📚 Section Navigation
- [🏠 API Overview](README.md)
- [🔐 Authentication](authentication.md)
- [📜 Certificates](certificates.md)
- [🖥️ System](system.md)
- [💻 Examples](examples.md) ← You are here

This document provides practical examples of using the Family VPN Server API in different programming languages.

## Base Configuration

All examples assume the following base configuration:

- **Base URL**: `https://your-server-address:3000`
- **Authentication**: JWT tokens via HTTP-only cookies
- **Content Type**: `application/json` for requests
- **HTTPS**: Required for all API calls

## JavaScript/Node.js Examples

### Complete VPN Client Class

```javascript
const axios = require('axios');

class VPNClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.accessToken = null;
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        username,
        password
      }, {
        withCredentials: true
      });
      
      console.log('Login successful');
      return response.data;
    } catch (error) {
      console.error('Login failed:', error.response.data);
      throw error;
    }
  }

  async generateCertificate(clientName, email) {
    try {
      const response = await axios.post(`${this.baseURL}/api/generate-cert`, {
        clientName,
        email
      }, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      return response.data; // .ovpn file content
    } catch (error) {
      console.error('Certificate generation failed:', error.response.data);
      throw error;
    }
  }

  async getCertificates() {
    try {
      const response = await axios.get(`${this.baseURL}/api/certificates`, {
        withCredentials: true
      });
      
      return response.data.certificates;
    } catch (error) {
      console.error('Failed to get certificates:', error.response.data);
      throw error;
    }
  }

  async getSystemStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/api/status`, {
        withCredentials: true
      });
      
      return response.data.status;
    } catch (error) {
      console.error('Failed to get system status:', error.response.data);
      throw error;
    }
  }

  async revokeCertificate(certificateId) {
    try {
      const response = await axios.delete(`${this.baseURL}/api/certificates/${certificateId}`, {
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to revoke certificate:', error.response.data);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/logout`, {}, {
        withCredentials: true
      });
      
      console.log('Logout successful');
      return response.data;
    } catch (error) {
      console.error('Logout failed:', error.response.data);
      throw error;
    }
  }
}

// Usage Example
async function main() {
  const client = new VPNClient('https://your-server:3000');

  try {
    // Login
    await client.login('admin', 'password');
    
    // Get current certificates
    const certificates = await client.getCertificates();
    console.log('Current certificates:', certificates);
    
    // Generate new certificate
    const ovpnFile = await client.generateCertificate('new-client', 'user@example.com');
    
    // Save certificate to file
    const fs = require('fs');
    fs.writeFileSync('new-client.ovpn', ovpnFile);
    console.log('Certificate saved to new-client.ovpn');
    
    // Get system status
    const status = await client.getSystemStatus();
    console.log('System status:', status);
    
    // Logout
    await client.logout();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### Browser JavaScript Example

```javascript
class VPNWebClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async login(username, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  }

  async getCertificates() {
    const response = await fetch(`${this.baseURL}/api/certificates`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    return data.certificates;
  }

  async downloadCertificate(clientName, email) {
    const response = await fetch(`${this.baseURL}/api/generate-cert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ clientName, email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    // Create download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientName}.ovpn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
```

## Python Examples

### Complete Python Client

```python
import requests
import json
from typing import Optional, List, Dict

class VPNClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
    
    def login(self, username: str, password: str) -> Dict:
        """Login and establish session"""
        response = self.session.post(f"{self.base_url}/auth/login", json={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            print("Login successful")
            return response.json()
        else:
            error_data = response.json()
            print(f"Login failed: {error_data}")
            response.raise_for_status()
    
    def generate_certificate(self, client_name: str, email: Optional[str] = None) -> bytes:
        """Generate and return certificate content"""
        data = {"clientName": client_name}
        if email:
            data["email"] = email
            
        response = self.session.post(f"{self.base_url}/api/generate-cert", json=data)
        
        if response.status_code == 200:
            return response.content  # .ovpn file content
        else:
            error_data = response.json()
            print(f"Certificate generation failed: {error_data}")
            response.raise_for_status()
    
    def get_certificates(self) -> List[Dict]:
        """Get list of all certificates"""
        response = self.session.get(f"{self.base_url}/api/certificates")
        
        if response.status_code == 200:
            return response.json()["certificates"]
        else:
            error_data = response.json()
            print(f"Failed to get certificates: {error_data}")
            response.raise_for_status()
    
    def get_certificate_details(self, cert_id: str) -> Dict:
        """Get detailed information about a specific certificate"""
        response = self.session.get(f"{self.base_url}/api/certificates/{cert_id}")
        
        if response.status_code == 200:
            return response.json()["certificate"]
        else:
            error_data = response.json()
            print(f"Failed to get certificate details: {error_data}")
            response.raise_for_status()
    
    def revoke_certificate(self, cert_id: str) -> Dict:
        """Revoke a certificate"""
        response = self.session.delete(f"{self.base_url}/api/certificates/{cert_id}")
        
        if response.status_code == 200:
            return response.json()
        else:
            error_data = response.json()
            print(f"Failed to revoke certificate: {error_data}")
            response.raise_for_status()
    
    def get_system_status(self) -> Dict:
        """Get system status and statistics"""
        response = self.session.get(f"{self.base_url}/api/status")
        
        if response.status_code == 200:
            return response.json()["status"]
        else:
            error_data = response.json()
            print(f"Failed to get system status: {error_data}")
            response.raise_for_status()
    
    def get_logs(self, level: Optional[str] = None, limit: int = 100, since: Optional[str] = None) -> List[Dict]:
        """Get system logs with optional filtering"""
        params = {"limit": limit}
        if level:
            params["level"] = level
        if since:
            params["since"] = since
            
        response = self.session.get(f"{self.base_url}/api/logs", params=params)
        
        if response.status_code == 200:
            return response.json()["logs"]
        else:
            error_data = response.json()
            print(f"Failed to get logs: {error_data}")
            response.raise_for_status()
    
    def logout(self) -> Dict:
        """Logout and clear session"""
        response = self.session.post(f"{self.base_url}/auth/logout")
        
        if response.status_code == 200:
            print("Logout successful")
            return response.json()
        else:
            error_data = response.json()
            print(f"Logout failed: {error_data}")
            response.raise_for_status()

# Usage Example
def main():
    client = VPNClient("https://your-server:3000")
    
    try:
        # Login
        client.login("admin", "password")
        
        # Get current certificates
        certificates = client.get_certificates()
        print(f"Found {len(certificates)} certificates")
        
        # Generate new certificate
        ovpn_content = client.generate_certificate("python-client", "user@example.com")
        
        # Save certificate to file
        with open("python-client.ovpn", "wb") as f:
            f.write(ovpn_content)
        print("Certificate saved to python-client.ovpn")
        
        # Get system status
        status = client.get_system_status()
        print(f"Server uptime: {status['server']['uptime']} seconds")
        print(f"Connected clients: {status['openvpn']['connectedClients']}")
        
        # Get recent error logs
        error_logs = client.get_logs(level="error", limit=10)
        print(f"Recent errors: {len(error_logs)}")
        
        # Logout
        client.logout()
        
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
```

## cURL Examples

### Authentication

```bash
# Login
curl -X POST https://your-server:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  -c cookies.txt

# Use stored cookies for subsequent requests
curl -X GET https://your-server:3000/api/status \
  -b cookies.txt

# Logout
curl -X POST https://your-server:3000/auth/logout \
  -b cookies.txt
```

### Certificate Management

```bash
# Generate certificate
curl -X POST https://your-server:3000/api/generate-cert \
  -H "Content-Type: application/json" \
  -d '{"clientName":"curl-client","email":"user@example.com"}' \
  -b cookies.txt \
  -o curl-client.ovpn

# List certificates
curl -X GET https://your-server:3000/api/certificates \
  -b cookies.txt

# Get certificate details
curl -X GET https://your-server:3000/api/certificates/1 \
  -b cookies.txt

# Revoke certificate
curl -X DELETE https://your-server:3000/api/certificates/1 \
  -b cookies.txt
```

### System Monitoring

```bash
# Health check (no auth required)
curl -X GET https://your-server:3000/health

# System status
curl -X GET https://your-server:3000/api/status \
  -b cookies.txt

# Get logs
curl -X GET "https://your-server:3000/api/logs?level=error&limit=50" \
  -b cookies.txt
```

## Error Handling Examples

### JavaScript Error Handling

```javascript
async function handleAPICall() {
  try {
    const response = await axios.post('/api/generate-cert', {
      clientName: 'test-client'
    }, { withCredentials: true });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Validation error:', data.error);
          break;
        case 401:
          console.error('Authentication required');
          // Redirect to login
          break;
        case 429:
          console.error('Rate limit exceeded');
          break;
        default:
          console.error('API error:', data.error);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      // Other error
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}
```

### Python Error Handling

```python
import requests
from requests.exceptions import RequestException, HTTPError

def handle_api_call():
    try:
        response = requests.post(
            'https://your-server:3000/api/generate-cert',
            json={'clientName': 'test-client'},
            cookies=cookies
        )
        response.raise_for_status()
        return response.json()
        
    except HTTPError as e:
        status_code = e.response.status_code
        error_data = e.response.json()
        
        if status_code == 400:
            print(f"Validation error: {error_data['error']}")
        elif status_code == 401:
            print("Authentication required")
            # Handle re-authentication
        elif status_code == 429:
            print("Rate limit exceeded")
        else:
            print(f"API error: {error_data['error']}")
            
        raise
        
    except RequestException as e:
        print(f"Network error: {e}")
        raise
```

## Rate Limiting Handling

### Respect Rate Limits

```javascript
class RateLimitedClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  async makeRequest(config) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ config, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { config, resolve, reject } = this.requestQueue.shift();

      try {
        const response = await axios(config);
        
        // Check rate limit headers
        const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '0');
        const resetTime = parseInt(response.headers['x-ratelimit-reset'] || '0');
        
        if (remaining <= 1 && resetTime > 0) {
          const waitTime = (resetTime * 1000) - Date.now();
          if (waitTime > 0) {
            console.log(`Rate limit approaching, waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        resolve(response);
      } catch (error) {
        if (error.response?.status === 429) {
          // Rate limited, wait and retry
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          console.log(`Rate limited, retrying after ${retryAfter} seconds`);
          
          setTimeout(() => {
            this.requestQueue.unshift({ config, resolve, reject });
          }, retryAfter * 1000);
        } else {
          reject(error);
        }
      }
    }

    this.isProcessing = false;
  }
}
```

## Related Documents

- [Authentication API](authentication.md)
- [Certificate Management API](certificates.md)
- [System API](system.md)