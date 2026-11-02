RIVE WINAMP - READY-TO-UPLOAD BUILD

Upload this folder's contents to your website's public directory, or upload
this folder itself and visit its URL. For example:
  https://example.com/             (contents uploaded to the web root)
  https://example.com/deploy/      (deploy folder uploaded as a subdirectory)

Keep index.html, bridge.js, player.riv and vendor/ together. Paths are relative,
so the same package works at the site root or inside a subdirectory.

REQUIRED HOST SETTINGS

1. Serve the site over HTTPS (localhost is allowed for local testing).
2. Send these response headers on the HTML page and preferably all files:
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
3. Serve .wasm files with Content-Type: application/wasm.

HOST CONFIGURATION INCLUDED

Apache / typical Apache shared hosting:
  Keep the hidden .htaccess file when uploading. It sets the headers and WASM
  MIME type when mod_headers/mod_mime and the host's override settings allow it.
  If the player reports missing headers, ask the host to enable these settings.

Netlify / Cloudflare Pages:
  The included _headers file sets the required headers for these static hosts.
  Choose deploy as the publish/output directory. No build command is needed.

Other hosts (including Nginx, S3, GitHub Pages and custom CDNs):
  .htaccess and _headers are not universal. Configure the required headers in
  that host's own settings. Hosting must support custom response headers for
  Rive's audio threads; uploading the files alone cannot add server headers.

WHAT IS INCLUDED

index.html       Browser page and toolbar
bridge.js        Browser integration; no localhost /api/build dependency
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
while retaining relative asset paths and omitting the local build API check.
