# Fusion Tech Dynamics Website

The production website is a static Cloudflare Pages site. Flask is used only as
a local template renderer to generate the deployable `public/` directory.

## Build locally

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python build_static.py
```

## Preview locally

```bash
.venv/bin/python -m http.server 8080 --directory public
```

## Cloudflare Pages settings

- Production branch: `main`
- Framework preset: `None`
- Build command: leave blank
- Build output directory: `public`
- Root directory: leave blank

Every push to `main` deploys the committed static output. Re-run
`build_static.py` before committing whenever templates or static assets change.
