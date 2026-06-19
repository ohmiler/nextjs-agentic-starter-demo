# TestSprite CLI — ชมรม dev ยุค ai

TestSprite รัน E2E tests บน **cloud browser** กับ URL ที่เข้าถึงได้จาก public — **ไม่รองรับ `localhost` ใน CLI**

## Prerequisites

1. **API key** จาก https://www.testsprite.com/settings/apikey
2. **Public URL** ของแอป (deploy preview, staging, หรือ tunnel)
3. Node.js ≥ 20

## One-time setup

```powershell
# 1. Configure credentials
$env:TESTSPRITE_API_KEY = "sk-..."
npx @testsprite/testsprite-cli auth configure --from-env

# 2. Verify
npx @testsprite/testsprite-cli auth whoami

# 3. Create project (use public URL — not localhost)
npx @testsprite/testsprite-cli project create `
  --type frontend `
  --name "dev-yuk-ai-membership" `
  --url "https://YOUR-PUBLIC-URL.example.com" `
  --output json

# 4. Save project id to .testsprite/config.json
#    Replace REPLACE_WITH_PROJECT_ID in plans/membership-v1.jsonl
```

## Run tests (batch)

```powershell
$targetUrl = "https://YOUR-PUBLIC-URL.example.com"

npx @testsprite/testsprite-cli test create-batch `
  --plans ./testsprite/plans/membership-v1.jsonl `
  --run --wait `
  --target-url $targetUrl `
  --max-concurrency 3 `
  --timeout 600 `
  --output json
```

## Local dev workaround

CLI **ไม่รองรับ localhost**. ตัวเลือก:

| วิธี | คำสั่ง |
|------|--------|
| Deploy preview | Vercel/Railway/VPS แล้วใช้ URL นั้น |
| Cloudflare tunnel | `cloudflared tunnel --url http://localhost:3000` |
| TestSprite MCP | ใช้ `@testsprite/testsprite-mcp` ใน Cursor (มี local tunnel built-in) |

## On failure

```powershell
npx @testsprite/testsprite-cli test failure get <test-id> --out ./.testsprite/failure
npx @testsprite/testsprite-cli test artifact get <run-id> --out ./.testsprite/runs/<run-id>/
```

## Plans included

| Test | Priority |
|------|----------|
| Home page branding + CTA | p0 |
| Register → dashboard | p0 |
| Logout → dashboard blocked | p1 |
| Public members list | p1 |
| Login invalid credentials (Thai error) | p1 |
