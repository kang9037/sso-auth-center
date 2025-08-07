// SSO System Configuration
const config = {
    // Supabase Configuration
    supabase: {
        url: 'https://syhgibrayncezgljxdzs.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aGdpYnJheW5jZXpnbGp4ZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Nzk0NTMsImV4cCI6MjA2OTM1NTQ1M30.PdzNh6stgZwobuSAGSK_z6Hn98-VsaU44ldTWrM6szk',
    },
    
    // SSO Configuration
    sso: {
        authServerUrl: 'http://localhost:3001', // Production: https://auth.yourdomain.com
        tokenKey: 'sso_token',
        sessionKey: 'sso_session',
        refreshTokenKey: 'sso_refresh_token',
        tokenExpiry: 3600000, // 1 hour in milliseconds
        refreshTokenExpiry: 604800000, // 7 days in milliseconds
    },
    
    // Service URLs
    services: {
        auth: 'http://localhost:3001',
        quiz: 'http://localhost:8000',  // Quiz 서비스 추가
        service1: 'http://localhost:3002',
        service2: 'http://localhost:3003',
        service3: 'http://localhost:3004',
    },
    
    // Security Configuration
    security: {
        csrfTokenKey: 'csrf_token',
        allowedOrigins: [
            'http://localhost:3001',
            'http://localhost:8000',  // Quiz 서비스 도메인 추가
            'http://localhost:3002',
            'http://localhost:3003',
            'http://localhost:3004',
            'http://127.0.0.1:8000',  // 127.0.0.1로도 접근 가능
            // Add production domains here
        ],
    },
    
    // UI Configuration
    ui: {
        brandName: 'SSO System',
        primaryColor: '#4F46E5',
        successColor: '#10B981',
        errorColor: '#EF4444',
    }
};

// Environment-specific configuration
if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Production configuration (Vercel deployment)
        config.sso.authServerUrl = 'https://sso-auth-center.vercel.app';
        config.services = {
            auth: 'https://sso-auth-center.vercel.app',
            quiz: 'https://quiz-liart-ten.vercel.app',  // Quiz 서비스 Vercel URL
            service1: 'https://app1.ssemgong.com',
            service2: 'https://app2.ssemgong.com',
            service3: 'https://app3.ssemgong.com',
        };
        config.security.allowedOrigins = [
            'https://sso-auth-center.vercel.app',
            'https://quiz-liart-ten.vercel.app',  // Quiz 서비스 Vercel 도메인
            'https://app1.ssemgong.com',
            'https://app2.ssemgong.com',
            'https://app3.ssemgong.com',
        ];
    }
}

export default config;