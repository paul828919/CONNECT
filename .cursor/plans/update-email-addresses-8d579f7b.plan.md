<!-- 8d579f7b-9ae0-4f56-b5b8-f69ad91367b3 d2465687-aadc-42a0-b6e8-687b60daf077 -->
# Verify and Deploy Email Updates

## Step 1: Local Verification

**Verify all email addresses have been updated:**

- Search entire app directory for old email patterns (`@connect.kr`)
- Confirm the 3 changed files now use `@connectplt.kr`
- Check for any missed occurrences in the app directory

**Files already updated:**

- ✅ `lib/email/config.ts` - noreply and support addresses
- ✅ `app/api/feedback/route.ts` - admin feedback email
- ✅ `app/auth/error/page.tsx` - support contact link

## Step 2: Git Commit and Push

**Commit the changes:**

```bash
git add lib/email/config.ts app/api/feedback/route.ts app/auth/error/page.tsx
git commit -m "feat: Update email addresses to official domain (@connectplt.kr)"
git push origin main
```

**Commit message follows conventional commits:**

- `feat:` prefix for new feature/update
- Clear description of what changed

## Step 3: Monitor Deployment

**GitHub Actions will automatically:**

1. Run tests and linting
2. Build Docker images
3. Deploy to production server
4. Restart services

**Monitor at:** GitHub repository → Actions tab

## Expected Results

- ✅ All emails in app directory use `@connectplt.kr`
- ✅ Changes committed to git
- ✅ Pushed to GitHub main branch
- ✅ CI/CD pipeline triggers automatically
- ✅ Production server receives updates
- ✅ Users see new email addresses

## Notes

- Only pushing 3 files with email updates (safe, isolated change)
- No breaking changes expected
- Deployment should complete in ~5-10 minutes
- Email functionality will work with AWS SES configuration

### To-dos

- [ ] Verify all email addresses in app directory are updated to @connectplt.kr
- [ ] Commit email changes with descriptive message
- [ ] Push changes to GitHub main branch
- [ ] Monitor GitHub Actions deployment to production