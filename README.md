# Fusion Tech Dynamics website

Static site: plain HTML, CSS and JavaScript in `public/`. No framework, no build step.
The previous Flask-generated site is preserved under the git tag `old-site-backup`.

## Cloudflare Pages settings

- Production branch: `main`
- Framework preset: `None`
- Build command: leave blank
- Build output directory: `public`
- Root directory: leave blank

Every push to `main` deploys `public/` as it is committed. Any other branch gets a preview at
`https://<branch>.<project>.pages.dev`.

## Layout

```
public/
├── index.html, services.html, orvex.html, recura.html, cubbo.html,
│   about.html, careers.html, training.html, privacy.html, terms.html
├── 404.html        Returned by Cloudflare for any missing URL
├── _redirects      Old site URLs -> new pages
├── _headers        Security headers
├── robots.txt, sitemap.xml
├── css/site.css    All styles
├── js/site.js      All interactions, animation and form sending
├── img/            Images
└── video/          Hero video + poster
```

`css/site.css?v=…` and `js/site.js?v=…` carry a version number for cache-busting.
After editing CSS or JS, change the number in all 11 HTML files.

## Forms

The home page enquiry form and the careers form post to FormSubmit
(`https://formsubmit.co/ajax/contact@fusiontechdynamics.com`) from `sendForm()` near the top
of `js/site.js`. Change `FORM_EMAIL` there to use another address. The thank-you message only
shows after FormSubmit confirms delivery. A hidden `_honey` field filters spam bots.

## Run locally

```bash
python -m http.server 4321 --directory public
```

Open http://localhost:4321/index.html. Extensionless URLs (`/about`), `_redirects` and the
404 page only work on Cloudflare Pages.
