// Import Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Import configuration
import config from '../shared/config.js';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const loadingSpinner = document.getElementById('loadingSpinner');
const messageContainer = document.getElementById('messageContainer');

// Form Elements
const loginFormElement = document.getElementById('loginFormElement');
const signupFormElement = document.getElementById('signupFormElement');
const forgotPasswordFormElement = document.getElementById('forgotPasswordFormElement');

// Navigation Links
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const showForgotPasswordLink = document.getElementById('showForgotPassword');
const backToLoginLink = document.getElementById('backToLogin');

// Utility Functions
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
}

function showLoading(show = true) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

function switchForm(formToShow) {
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    forgotPasswordForm.style.display = 'none';
    formToShow.style.display = 'block';
    messageContainer.innerHTML = '';
}

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        client_id: params.get('client_id'),
        redirect_uri: params.get('redirect_uri'),
        response_type: params.get('response_type') || 'token',
        scope: params.get('scope') || 'openid profile email',
        state: params.get('state')
    };
}

function generateToken(user) {
    // In production, this should be done server-side with a proper JWT library
    // For demo purposes, we'll create a simple token structure
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const payload = {
        sub: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email.split('@')[0],
        role: user.role || 'user',
        user_metadata: user.user_metadata || {},
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        iss: config.services.auth,
        aud: getQueryParams().client_id || config.services.auth
    };
    
    // Simple base64 encoding (NOT secure for production!)
    const base64Header = btoa(JSON.stringify(header));
    const base64Payload = btoa(JSON.stringify(payload));
    const signature = btoa('demo-signature'); // In production, use proper HMAC-SHA256
    
    return `${base64Header}.${base64Payload}.${signature}`;
}

async function handleSuccessfulLogin(session) {
    const queryParams = getQueryParams();
    const user = session.user;
    
    // Generate SSO token
    const ssoToken = generateToken(user);
    const refreshToken = session.refresh_token;
    
    // Store tokens
    localStorage.setItem(config.sso.tokenKey, ssoToken);
    localStorage.setItem(config.sso.refreshTokenKey, refreshToken);
    localStorage.setItem(config.sso.sessionKey, JSON.stringify({
        user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split('@')[0]
        },
        expires_at: session.expires_at
    }));
    
    // If this is an SSO request, redirect back to the client
    if (queryParams.redirect_uri) {
        const redirectUrl = new URL(queryParams.redirect_uri);
        
        // Add token to URL fragment (for implicit flow)
        if (queryParams.response_type === 'token') {
            redirectUrl.hash = `access_token=${ssoToken}&token_type=Bearer&expires_in=3600`;
            if (refreshToken) {
                redirectUrl.hash += `&refresh_token=${refreshToken}`;
            }
            if (queryParams.state) {
                redirectUrl.hash += `&state=${queryParams.state}`;
            }
        }
        
        window.location.href = redirectUrl.toString();
    } else {
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Event Handlers
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    showLoading(true);
    messageContainer.innerHTML = '';
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showMessage('로그인 성공! 잠시만 기다려주세요...', 'success');
        
        // Handle successful login
        await handleSuccessfulLogin(data.session);
        
    } catch (error) {
        showMessage(error.message || '로그인 중 오류가 발생했습니다.', 'error');
        console.error('Login error:', error);
    } finally {
        showLoading(false);
    }
});

signupFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    const name = document.getElementById('signupName').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validation
    if (password !== passwordConfirm) {
        showMessage('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }
    
    if (password.length < 8) {
        showMessage('비밀번호는 최소 8자 이상이어야 합니다.', 'error');
        return;
    }
    
    if (!agreeTerms) {
        showMessage('이용약관에 동의해주세요.', 'error');
        return;
    }
    
    showLoading(true);
    messageContainer.innerHTML = '';
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });
        
        if (error) throw error;
        
        if (data.user) {
            showMessage('회원가입이 완료되었습니다! 이메일을 확인해주세요.', 'success');
            
            // Auto-login after signup (if email confirmation is not required)
            if (data.session) {
                setTimeout(() => {
                    handleSuccessfulLogin(data.session);
                }, 2000);
            } else {
                setTimeout(() => {
                    switchForm(loginForm);
                }, 2000);
            }
        }
        
    } catch (error) {
        showMessage(error.message || '회원가입 중 오류가 발생했습니다.', 'error');
        console.error('Signup error:', error);
    } finally {
        showLoading(false);
    }
});

forgotPasswordFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    
    showLoading(true);
    messageContainer.innerHTML = '';
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) throw error;
        
        showMessage('비밀번호 재설정 링크를 이메일로 보냈습니다.', 'success');
        
        setTimeout(() => {
            switchForm(loginForm);
        }, 3000);
        
    } catch (error) {
        showMessage(error.message || '비밀번호 재설정 중 오류가 발생했습니다.', 'error');
        console.error('Password reset error:', error);
    } finally {
        showLoading(false);
    }
});

// Navigation Event Listeners
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(signupForm);
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm);
});

showForgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(forgotPasswordForm);
});

backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm);
});

// Check for existing session on page load
window.addEventListener('load', async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            // User is already logged in
            const queryParams = getQueryParams();
            
            if (queryParams.redirect_uri) {
                // This is an SSO request, redirect immediately
                await handleSuccessfulLogin(session);
            } else {
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            }
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
});

// Handle silent authentication requests
if (window.location.pathname.includes('silent-auth')) {
    (async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session && window.parent !== window) {
                // Send token to parent window
                const token = generateToken(session.user);
                window.parent.postMessage({
                    type: 'silent-auth-response',
                    token: token,
                    refreshToken: session.refresh_token
                }, '*');
            } else {
                window.parent.postMessage({
                    type: 'silent-auth-response',
                    token: null
                }, '*');
            }
        } catch (error) {
            console.error('Silent auth error:', error);
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'silent-auth-response',
                    token: null,
                    error: error.message
                }, '*');
            }
        }
    })();
}