# Docker Build Notes

## Frontend Build Issues & Resolutions

### Issue 1: Package Lock Sync Error

#### Problem
The frontend production Dockerfile failed with `npm ci` errors due to `package-lock.json` being out of sync with `package.json`:

```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync
npm error Missing: webpack@5.102.0 from lock file
npm error Invalid: lock file's acorn@8.14.1 does not satisfy acorn@8.15.0
```

#### Root Cause
- `npm ci` requires an exact match between `package.json` and `package-lock.json`
- The lockfile was generated on a different system or with a different npm version
- Next.js and webpack dependencies had version mismatches

#### Solution
Changed from `npm ci` to `npm install --legacy-peer-deps` in both build stages:

**Stage 1 (deps)**: Changed from `npm ci` to `npm install --legacy-peer-deps`
- Allows npm to regenerate the lockfile during build
- `--legacy-peer-deps` bypasses peer dependency conflicts common in Next.js projects

**Stage 3 (runner)**: Changed from `npm ci --omit=dev` to `npm install --omit=dev --legacy-peer-deps`
- Ensures production dependencies install correctly
- Maintains consistency with the deps stage

#### Trade-offs
- **Pro**: Builds succeed even with lockfile drift
- **Pro**: More forgiving of version mismatches across environments
- **Con**: Slightly less deterministic than `npm ci` (though still pinned by package.json)
- **Con**: Marginally slower than `npm ci`

#### Alternative Approach (Not Used)
Could regenerate `package-lock.json` locally and commit:
```bash
cd frontend
rm package-lock.json
npm install --legacy-peer-deps
git add package-lock.json
git commit -m "Regenerate package-lock.json"
```

This was not chosen because:
1. The Dockerfile fix is more portable across different developer environments
2. Avoids requiring all developers to have identical npm versions
3. CI/CD builds will work regardless of local lockfile state

#### Backend Build
The backend Dockerfile uses `npm ci --omit=dev` successfully because:
- Backend has simpler dependencies (Express, no complex build tooling)
- No peer dependency conflicts
- Lockfile remains stable

If backend encounters similar issues, apply the same fix.

### Issue 2: TypeScript Type Error

#### Problem
Build failed during Next.js compilation with TypeScript error:

```typescript
Type error: This comparison appears to be unintentional because the types 'boolean' and 'string' have no overlap.
  133 | {user.is_admin === "true" && (
```

#### Root Cause
The `user.is_admin` field is typed as `boolean` but was being compared to the string `"true"`.

#### Solution

### Issue 3: ECS Platform Mismatch

#### Problem
Pushed images built on Apple Silicon default to `linux/arm64`, causing ECS Fargate tasks to fail with `CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'`.

#### Solution
Build and push images explicitly for `linux/amd64` using Docker Buildx:

```bash
docker buildx build --platform linux/amd64 -f frontend/Dockerfile.prod -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest --push frontend
docker buildx build --platform linux/amd64 -f backend/Dockerfile.prod -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend:latest --push backend
```

When testing locally (without `--push`), run `docker build --platform linux/amd64 ...` to ensure ECR only stores amd64 manifests.
Changed comparison from `user.is_admin === "true"` to `user.is_admin` in `frontend/src/app/settings/settings.tsx`.

### Issue 4: Backend TypeScript Runtime Error

#### Problem
Backend container exited with code 1 immediately after start. CloudWatch logs showed:
```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for /app/middleware/validation-middleware.ts
```

Node.js cannot execute `.ts` files directly in production without a transpiler.

#### Root Cause
- Backend had 2 TypeScript files (`middleware/validation-middleware.ts`, `validators/schemas.ts`) imported by JavaScript routes.
- Production Dockerfile ran `node server.js` without compiling TypeScript first.

#### Solution
Converted TypeScript files to JavaScript equivalents:
- Created `middleware/validation-middleware.js` and `validators/schemas.js` with identical logic.
- Reverted `backend/Dockerfile.prod` to single-stage build without TypeScript compilation.
- Removed build pipeline complexity since only 2 files needed conversion.

---

**Updated**: 2025-10-01  
**Files Modified**: 
- `frontend/Dockerfile.prod`
- `frontend/src/app/settings/settings.tsx`
- `frontend/src/lib/userStore.ts`
- `backend/middleware/validation-middleware.js` (created)
- `backend/validators/schemas.js` (created)
- `backend/Dockerfile.prod`
