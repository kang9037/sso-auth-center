// SSO Client Library
class SSOClient {
    constructor(config) {
        this.config = config;
        this.authServerUrl = config.sso.authServerUrl;
        this.tokenKey = config.sso.tokenKey;
        this.sessionKey = config.sso.sessionKey;
        this.refreshTokenKey = config.sso.refreshTokenKey;
        this.currentService = window.location.origin;
        this.messageHandlers = new Map();
        this.initMessageListener();
    }

    // Initialize message listener for cross-domain communication
    initMessageListener() {
        window.addEventListener('message', (event) => {
            // Verify origin
            if (!this.config.security.allowedOrigins.includes(event.origin)) {
                console.warn('Message from unauthorized origin:', event.origin);
                return;
            }

            const { type, data } = event.data || {};
            
            if (this.messageHandlers.has(type)) {
                this.messageHandlers.get(type)(data);
            }
        });
    }

    // Register message handler
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    // Check if user is authenticated
    async isAuthenticated() {
        const token = this.getToken();
        if (!token) {
            return false;
        }

        // Verify token validity
        try {
            const payload = this.parseJWT(token);
            const now = Date.now() / 1000;
            
            if (payload.exp && payload.exp < now) {
                // Token expired, try to refresh
                return await this.refreshToken();
            }
            
            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    // Get stored token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Store token
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    // Get refresh token
    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey);
    }

    // Store refresh token
    setRefreshToken(token) {
        localStorage.setItem(this.refreshTokenKey, token);
    }

    // Parse JWT token
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            throw new Error('Invalid token format');
        }
    }

    // Get user info from token
    getUserInfo() {
        const token = this.getToken();
        if (!token) return null;
        
        try {
            const payload = this.parseJWT(token);
            return {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                role: payload.role,
                metadata: payload.user_metadata
            };
        } catch (error) {
            console.error('Error parsing user info:', error);
            return null;
        }
    }

    // Login - redirect to auth server
    login(returnUrl = window.location.href) {
        const params = new URLSearchParams({
            client_id: this.currentService,
            redirect_uri: returnUrl,
            response_type: 'token',
            scope: 'openid profile email'
        });
        
        window.location.href = `${this.authServerUrl}/login?${params.toString()}`;
    }

    // Logout
    async logout() {
        // Clear local tokens
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.sessionKey);
        sessionStorage.clear();
        
        // Notify auth server
        try {
            await fetch(`${this.authServerUrl}/api/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: this.currentService
                })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Redirect to auth server logout page
        window.location.href = `${this.authServerUrl}/logout?redirect_uri=${encodeURIComponent(this.currentService)}`;
    }

    // Silent authentication check
    async checkSilentAuth() {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = `${this.authServerUrl}/silent-auth?client_id=${encodeURIComponent(this.currentService)}`;
            
            const handleMessage = (event) => {
                if (event.origin !== new URL(this.authServerUrl).origin) {
                    return;
                }
                
                if (event.data.type === 'silent-auth-response') {
                    window.removeEventListener('message', handleMessage);
                    document.body.removeChild(iframe);
                    
                    if (event.data.token) {
                        this.setToken(event.data.token);
                        if (event.data.refreshToken) {
                            this.setRefreshToken(event.data.refreshToken);
                        }
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            };
            
            window.addEventListener('message', handleMessage);
            document.body.appendChild(iframe);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                resolve(false);
            }, 5000);
        });
    }

    // Refresh token
    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return false;
        }
        
        try {
            const response = await fetch(`${this.authServerUrl}/api/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: refreshToken,
                    client_id: this.currentService
                })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            if (data.access_token) {
                this.setToken(data.access_token);
                if (data.refresh_token) {
                    this.setRefreshToken(data.refresh_token);
                }
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    // Handle callback from auth server
    async handleCallback() {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const token = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const error = params.get('error');
        
        if (error) {
            console.error('Authentication error:', error);
            return false;
        }
        
        if (token) {
            this.setToken(token);
            if (refreshToken) {
                this.setRefreshToken(refreshToken);
            }
            
            // Clean up URL
            window.history.replaceState(null, null, window.location.pathname);
            
            return true;
        }
        
        return false;
    }

    // Protect route - check authentication before allowing access
    async protectRoute(onSuccess, onFailure) {
        // First check if we have a token from callback
        if (window.location.hash && window.location.hash.includes('access_token')) {
            const success = await this.handleCallback();
            if (success) {
                if (onSuccess) onSuccess(this.getUserInfo());
                return;
            }
        }
        
        // Check if already authenticated
        const isAuth = await this.isAuthenticated();
        if (isAuth) {
            if (onSuccess) onSuccess(this.getUserInfo());
            return;
        }
        
        // Try silent authentication
        const silentAuthSuccess = await this.checkSilentAuth();
        if (silentAuthSuccess) {
            if (onSuccess) onSuccess(this.getUserInfo());
            return;
        }
        
        // Not authenticated
        if (onFailure) {
            onFailure();
        } else {
            // Default behavior - redirect to login
            this.login();
        }
    }

    // Make authenticated API request
    async authenticatedFetch(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('No authentication token available');
        }
        
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // Handle token expiration
        if (response.status === 401) {
            const refreshSuccess = await this.refreshToken();
            if (refreshSuccess) {
                // Retry request with new token
                const newToken = this.getToken();
                headers.Authorization = `Bearer ${newToken}`;
                return fetch(url, { ...options, headers });
            } else {
                // Refresh failed, redirect to login
                this.login();
                throw new Error('Authentication failed');
            }
        }
        
        return response;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SSOClient;
}