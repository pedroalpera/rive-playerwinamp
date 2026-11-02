RIVE WINAMP - READY-TO-UPLOAD BUILD

Upload this folder's contents to your website's public directory, or upload
this folder itself and visit its URL. For example:
  https://example.com/             (contents uploaded to the web root)
  https://example.com/deploy/      (deploy folder uploaded as a subdirectory)

Keep index.html, bridge.js, player.riv and vendor/ together. Paths are relative,
so the same package works at the site root or inside a subdirectory.

GITHUB PAGES - NO CUSTOM HEADERS REQUIRED

1. Upload every file and folder here, including .nojekyll, to the repository.
   To put the player at the main Pages URL, upload deploy's CONTENTS to the
   repository root. Keep the runtime's vendor/ folder intact.
2. In the repository, open Settings > Pages. Choose "Deploy from a branch",
   select your branch (usually main), choose "/ (root)", and Save.
3. Wait for GitHub Pages to finish deployment, then open the HTTPS Pages URL.
   The first visit refreshes once to enable the audio threads. Later visits
   start normally. No npm build command or server application is needed.

If you upload deploy as a folder rather than copying its contents to the
repository root, still publish the repository root and open:
  https://YOUR-NAME.github.io/YOUR-REPOSITORY/deploy/
GitHub's branch settings select the root or docs directory, not an arbitrary
folder called deploy. A custom Pages Actions workflow is another option.

The bundled coi-serviceworker.js adds isolation headers in the browser.
isolation.js waits for the worker, performs one controlled refresh, and only
then lets bridge.js start Rive. The worker is local to this app's folder; it
does not upload files or cache content. Keep it alongside index.html.
GitHub Pages ignores .htaccess and _headers; those are included for other hosts.

OTHER HOSTS

Serve the site over HTTPS (localhost also works for testing). For hosts with
custom headers, the preferred configuration is:
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
Serve .wasm files with Content-Type: application/wasm.

Apache / typical Apache shared hosting:
  Keep .htaccess when uploading. It sets the headers and WASM MIME type when
  mod_headers/mod_mime and the host's override settings allow it.
Netlify / Cloudflare Pages:
  _headers supplies the required headers. Use deploy as the publish directory,
  with no build command.
Other static hosts:
  The local service worker can supply isolation where headers cannot be set,
  provided the browser and host permit service workers. If server headers
  already enable isolation, registration and the refresh are skipped.

WHAT IS INCLUDED

index.html       Browser page and toolbar
bridge.js        Browser integration; no localhost /api/build dependency
isolation.js     Waits for audio isolation before starting Rive
coi-serviceworker.js  Local isolation service worker (MIT, pinned upstream)
.nojekyll        Disables Jekyll when publishing from a GitHub Pages branch
player.riv       Latest locally published player, including the Zelda EQ fix,
                 default skin, demo audio, AnimaScript and bundled font
vendor/          Pinned Rive web runtime and all three WASM variants
licenses/        Third-party license notices
.htaccess        Apache configuration
_headers         Netlify / Cloudflare Pages configuration

No Python, Node.js, npm installation, Rive account, source code or server-side
application is needed on the hosting server. Rive's existing startup splash
is retained. Visitors choose music/skins from their own computers; these are
processed in their browsers and are not uploaded to your hosting server.

Updating the Rive source project does not automatically update this copy.
After another local publish, recopy build/rive-winamp.riv to deploy/player.riv.
If web/index.html or web/bridge.js changes, regenerate their deployment copies
while retaining relative asset paths, the isolation startup, and omission of
the local build API check. Retain the three GitHub Pages compatibility files.
