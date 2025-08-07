# SSO System - Single Sign-On Implementation

HTML, CSS, JavaScript로 구현한 SSO(Single Sign-On) 시스템입니다. Supabase를 백엔드로 사용하며 Vercel에 배포 가능합니다.

## 🎯 주요 기능

- **중앙 인증 서버**: 한 곳에서 모든 서비스 인증 관리
- **자동 로그인**: 한 번 로그인으로 모든 연동 서비스 자동 인증
- **JWT 토큰 기반**: 안전한 토큰 기반 인증
- **Cross-domain 지원**: PostMessage API를 통한 도메인 간 통신
- **Silent Authentication**: 백그라운드 자동 인증 확인

## 📁 프로젝트 구조

```
sso-system/
├── auth-server/          # 중앙 인증 서버
│   ├── index.html       # 로그인/회원가입 페이지
│   ├── dashboard.html   # 사용자 대시보드
│   ├── auth.js          # 인증 로직
│   └── styles.css       # 스타일
├── sso-client/          # SSO 클라이언트 라이브러리
│   └── sso-client.js    # 재사용 가능한 SSO 라이브러리
├── service-1/           # 서비스 1 (모바일 앱 테마)
├── service-2/           # 서비스 2 (비즈니스 테마)
├── service-3/           # 서비스 3 (게임 테마)
├── shared/              # 공통 설정
│   └── config.js        # 시스템 설정
├── package.json         # 프로젝트 의존성
└── README.md           # 문서
```

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
cd sso-system
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings > API에서 다음 정보 복사:
   - Project URL
   - Anon/Public Key

### 3. 설정 파일 수정

`shared/config.js` 파일을 열고 Supabase 정보 입력:

```javascript
supabase: {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
}
```

### 4. 로컬 개발 서버 실행

각 서비스를 별도 터미널에서 실행:

```bash
# 터미널 1 - 인증 서버
npm run dev:auth

# 터미널 2 - 서비스 1
npm run dev:service1

# 터미널 3 - 서비스 2
npm run dev:service2

# 터미널 4 - 서비스 3
npm run dev:service3
```

### 5. 접속 URL

- 인증 서버: http://localhost:3001
- 서비스 1: http://localhost:3002
- 서비스 2: http://localhost:3003
- 서비스 3: http://localhost:3004

## 🔐 SSO 작동 방식

### 로그인 플로우

1. 사용자가 서비스 접속
2. 미인증 시 중앙 인증 서버로 리다이렉트
3. 로그인/회원가입 수행
4. JWT 토큰 발급
5. 원래 서비스로 리다이렉트 (토큰 포함)
6. 서비스에서 토큰 검증 및 저장

### 자동 로그인 플로우

1. 다른 서비스 접속
2. Silent Authentication iframe 생성
3. 중앙 서버에서 세션 확인
4. 유효한 세션 있으면 토큰 자동 발급
5. PostMessage로 토큰 전달
6. 자동 로그인 완료

## 🌐 Vercel 배포

### 1. Vercel CLI 설치

```bash
npm i -g vercel
```

### 2. 각 서비스 배포

```bash
# 인증 서버 배포
cd auth-server
vercel

# 서비스 1 배포
cd ../service-1
vercel

# 서비스 2 배포
cd ../service-2
vercel

# 서비스 3 배포
cd ../service-3
vercel
```

### 3. 환경 변수 설정

Vercel 대시보드에서 각 프로젝트의 Environment Variables 설정:

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase Anon Key

### 4. 도메인 설정

Vercel 대시보드에서 Custom Domain 설정:

- auth.yourdomain.com → 인증 서버
- app1.yourdomain.com → 서비스 1
- app2.yourdomain.com → 서비스 2
- app3.yourdomain.com → 서비스 3

### 5. CORS 설정

`vercel.json` 파일 생성:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ]
}
```

## 🔧 커스터마이징

### 새 서비스 추가

1. service-1 폴더 복사
2. `index.html`에서 서비스 정보 수정
3. `styles.css`에서 테마 색상 변경
4. `config.js`에 새 서비스 URL 추가

### 인증 로직 수정

- `auth-server/auth.js`: 로그인/회원가입 로직
- `sso-client/sso-client.js`: 클라이언트 인증 처리

## 📝 테스트 시나리오

1. **최초 로그인**
   - 서비스 1 접속 → 로그인 화면 → 회원가입 → 자동 로그인

2. **SSO 테스트**
   - 서비스 1 로그인 상태에서 서비스 2 접속 → 자동 로그인 확인

3. **로그아웃**
   - 한 서비스에서 로그아웃 → 모든 서비스 로그아웃 확인

4. **토큰 만료**
   - 1시간 후 토큰 만료 → 자동 갱신 확인

## 🛡️ 보안 고려사항

- HTTPS 사용 필수 (프로덕션)
- httpOnly 쿠키 사용 권장
- CSRF 토큰 구현 필요
- Content Security Policy 설정
- Rate Limiting 구현

## 📚 참고 자료

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT.io](https://jwt.io/)
- [MDN Web Docs - PostMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [Vercel Documentation](https://vercel.com/docs)

## 🤝 기여

이슈와 PR은 언제나 환영합니다!

## 📄 라이선스

MIT License