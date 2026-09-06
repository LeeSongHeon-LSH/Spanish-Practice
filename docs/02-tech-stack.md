> LSHobby 설계 문서 — 목차·로드맵·§번호↔파일 매핑은 [README](README.md) 참조

> **개정 (2026-09-02, 코드 대조)**: Storage는 미사용(#57), PWA는 적용 완료(#19·#60), 테스트/CI 행과 주요 라이브러리 절 추가, 락인 체크리스트를 실제 충족 상태로.

## 2. 기술 스택 (확정)

| 레이어 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js (React)** | 프론트 + API Routes(`app/api/sentence` — Tatoeba 수집, 서비스 키 미노출) |
| 스타일 | **Tailwind CSS v4** | PostCSS 플러그인 방식(`@tailwindcss/postcss`). 모바일 우선 반응형 |
| DB | **Supabase (PostgreSQL)** | 무료 티어 |
| 인증 | **Supabase Auth** | |
| 스토리지 | ~~Supabase Storage~~ | **현재 미사용** — CS 폐기(#57)로 버킷 삭제. 첨부 기능 도입 시 재개(SEC-04 조건부) |
| 배포 | **집 PC 로컬 호스팅 + Tailscale** | 2026-08-30 Vercel에서 전환 (§16.5). 공개 CV만 GitHub Pages (§17) |
| 테스트/CI | **Vitest + GitHub Actions + pre-push 훅** | 통과 없이는 push·배포 없음 — 타이머가 CI 결과를 게이트로 읽는다(#74, §16.5) |
| 비용 | **0원** | 개인 취미 프로젝트 범위 내 |

**주요 런타임 라이브러리**: `ts-fsrs`(SRS 엔진, §6.3) · `react-markdown` + `remark-gfm` + `rehype-sanitize`(노트 렌더·SEC-05) · `@supabase/supabase-js`. 배치 스크립트는 `sharp`(아이콘 생성, 전이 의존)와 Gemini API(§16.13)를 쓴다.

### 2.1 왜 AWS가 아닌가
- 취미 프로젝트에 월 4~6만원 + 서버 관리 부담은 오버킬
- Supabase 무료 티어 + 집 PC 호스팅으로 충분 (DB 500MB, 스토리지 1GB)

### 2.2 락인(lock-in) 회피 원칙
호스팅 업체가 유료화되거나 마음이 바뀌어도 쉽게 옮길 수 있도록 다음을 지킨다.

- [x] **DB는 Supabase 사용** — 호스팅 업체 전용 저장소(Vercel Postgres/KV/Blob 등) **사용 금지**
- [x] 파일/이미지도 Supabase Storage (또는 Cloudflare R2) — 현재 파일 기능 자체가 없음
- [x] 모든 연결 정보는 **환경변수**로 관리, 코드 하드코딩 금지
- [x] 호스팅 전용 API 최소화, 표준 Next.js 기능 위주
- [x] 정기 백업 (`pg_dump`) — `lshobby-backup.timer` 주 1회 + 매회 복원 리허설(§16.14, 2026-09-06). Notion 미러(§16.12)는 사람이 읽는 백업이지 복원용이 아니다

> 이 원칙을 지킨 덕에 **2026-08-30 Vercel → 집 PC 이전이 실제로 반나절도 안 걸렸다**(#73) —
> 코드에서 뗀 것은 `.vercelignore`뿐. Supabase → 다른 PostgreSQL 이전은 여전히 반나절 수준.

### 2.3 모바일 우선 설계
입력의 대부분이 모바일에서 발생하므로 **모바일 우선 → PC 확장** 순서로 설계.

```
스페인어 단어 암기  → 지하철, 자투리 시간 → 📱
독서 중 인용구 기록  → 책 읽다가 바로      → 📱
추억/사진 기록      → 찍은 그 자리에서     → 📱
월간 회고, 통계     → 책상 앞에서          → 💻
```

**모바일 체크포인트**
- 터치 타겟 44px 이상
- 하단 탭 네비게이션 (상단 메뉴는 한 손으로 못 닿음)
- 입력 폼 최소화 (필드 2~3개)
- ~~사진 업로드 전 클라이언트 리사이즈~~ — 사진 기능 없음(#57)
- **PWA 적용 완료** (#19·#60) — `manifest.ts`(standalone, 시작 `/home`) + `public/sw.js` 기본 캐싱 + 마스코트 도트 아이콘. 오프라인 퀴즈 없음

