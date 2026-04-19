# Deployment & Git

---

## GitHub Pages — Vite SPA deployment

**Symptom:** GitHub Pages deployment fails with 404 even though the workflow runs green.  
**Root cause:** GitHub Pages source must be set to **GitHub Actions** before the `deploy-pages` action can create a deployment. The default "Deploy from branch" mode doesn't work with the Actions-based workflow.  
**Fix:**
1. Go to **Settings → Pages → Build and deployment → Source** → select **GitHub Actions** and save.
2. Set `base` in `vite.config.js` to the repo name so asset paths resolve correctly:
```js
export default defineConfig({ base: '/your-repo-name/' })
```
3. Store env vars as repository **Secrets** (Settings → Secrets → Actions) and inject them in the workflow:
```yaml
- run: npm run build
  env:
    VITE_GROQ_API_KEY: ${{ secrets.VITE_GROQ_API_KEY }}
```

**Re-running vs fresh run:** When the first-ever deploy fails (404), re-running the old job may not help. Trigger a fresh run via **Actions → Run workflow** instead.

---

## GitHub authentication in non-interactive environments

**Symptom:** `git push` fails with `could not read Username for 'https://github.com': No such device or address`.  
**Root cause:** HTTPS authentication needs an interactive terminal for credential prompts — not available in agent/automated environments.  
**Fix:** Use SSH instead:
```bash
ssh-keygen -t ed25519 -C "your-email" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub  # add to GitHub → Settings → SSH Keys
git remote set-url origin git@github.com:owner/repo.git
```

---

## Protecting secrets before first git commit

**Rule:** Add `.env` to `.gitignore` *before* `git init` or before the first commit — not after. Once a secret is committed it is in git history even after deletion, and must be rotated.
```bash
# Safe order:
echo ".env"   >> .gitignore
echo ".env.*" >> .gitignore
git add .gitignore
git commit -m "chore: ignore env files"
# THEN add your .env and start working
```
Always provide a `.env.example` with placeholder values so collaborators know what variables are needed.
