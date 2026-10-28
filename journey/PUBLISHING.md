# Publishing the walkthrough

The interactive walkthrough is available through [HTML Preview](https://htmlpreview.github.io/?https://raw.githubusercontent.com/Chadzzy/MLDOT/e03545c7dbc3e5da12be3c2e65411111f72cc435/index.html). Its self-contained HTML is published on the dedicated `codex/journey-preview` branch of `Chadzzy/MLDOT`, at commit `e03545c7dbc3e5da12be3c2e65411111f72cc435`. The main branch was not changed. Homepage, weather, gate/boarding-pass updates, entertainment saving and cancellation/recovery were verified using the actual public viewer and source responses. HTTPS transport used the platform proxy and verified CA trust; Chromium rendered those responses. No TLS checks were disabled.

GitHub API access works, but enabling GitHub Pages returned **403 Resource not accessible by integration**. Repository metadata showing admin permissions did not establish that the integration could enable Pages. The current working link uses HTML Preview; it is not a GitHub Pages deployment owned by this repository.

The application source and workflow remain uncommitted on local branch `work`. Only the built standalone HTML and `.nojekyll` were published to the dedicated preview branch in response to the user's request for a usable preview. The exact night-time header photo and production UI icon exports remain outstanding; official Cathay fonts, brand marks and lounge photography are now embedded.

The repository workflow `.github/workflows/journey-pages.yml` is prepared for a manually initiated GitHub Pages deployment. It publishes only the built walkthrough HTML, not the repository's notebooks or other applications. The site contains simulated flight data, official imagery and optional public weather/transit calls.

Before deploying:

1. Confirm public publication is appropriate. A Pages deployment uses the repository's configured Pages site and can replace any existing site there; check the current setting first.
2. Make the new `journey/` source and workflow available on the repository's default branch through the normal review process.
3. Set the repository's **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
4. Run **Actions → Publish journey walkthrough → Run workflow**.

The deployment job reports the actual published URL. Do not present a guessed Pages URL as a working link. No deployment runs automatically on push. This setup needs GitHub access and repository permissions; it does not fix this chat client's disabled file downloads.

The latest public build adds three live public requests (HKO weather, HKO warnings, MTR Airport Express) and a source-verified Cathay lounge directory. The hosted build passed `tests/live_browser.py`, including real API responses and a separately simulated outage. See `INTEGRATIONS.md` for source evidence and limitations.
