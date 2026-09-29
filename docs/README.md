# Docs (GitHub Pages)

POC flow documentation for traveler and admin/agency lives in [`index.md`](./index.md).

## Enable GitHub Pages

1. Push `docs/` to the default branch (`main`).
2. Repo **Settings → Pages**.
3. **Build and deployment → Source:** Deploy from a branch.
4. Branch: `main`, folder: **`/docs`** → Save.

Site URL will be `https://<org-or-user>.github.io/<repo>/` (set `baseurl` in [`_config.yml`](./_config.yml) if the project site path is not `/`).

## Local preview (optional)

```bash
# from repo root — requires Ruby + Bundler + jekyll
cd docs
# or: bundle exec jekyll serve --source docs
```

Mermaid diagrams render via CDN in the default layout. On GitHub.com file view, native Mermaid also works for fenced `mermaid` blocks.
