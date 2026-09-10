# Homepage Video And Navigation Fix

Branch: `fix-homepage-video-navigation`. This branch includes the previous
`fix-auth-confirmation-demo-session` fixes, so deploy/merge the latest branch
for the combined retest. No EA rebuild or new SQL migration is required.

## Changes

- Watch Video opens a native modal video player using the supplied MP4.
  Playback controls, inline mobile playback, Escape/Close, focus restoration,
  scroll locking and an unavailable-media fallback are included.
- The public video is `public/assets/video/tfp-edge.mp4`. Its content matches
  the original `assets/video/TFP EDGE video.mp4`, which remains untouched.
- The hero Get Access button sends logged-out visitors to TFP registration.
  Its analytics event is now registration intent, not an XM affiliate click.
  The explicit XM registration button retains the supplied affiliate URL.
- Signed-in visitors see Portal on the homepage and access buttons return them
  to their dashboard. Visiting `/login` with a valid session also returns to
  the dashboard instead of presenting another login form.
- Homepage requests now participate in the auth session-refresh proxy and are
  not cached as shared authenticated content.
- The admin redirect report was tested with the preceding logout/session fix
  included. No admin authorization bypass was introduced: non-admin users are
  still redirected to their own dashboard with an access-required message.

## Verification (2026-09-10)

- Production build (including TypeScript) passed.
- All 14 existing auth regression tests passed.
- A real headless Edge browser checked the local production build against the
  configured Supabase project using disposable normal and admin test accounts.
  Both accounts were removed after testing; no existing user's role was changed.
- Video loaded as 1920x1080, duration 26.167 seconds. Playback time advanced on
  both 1440x1000 desktop and 390x844 mobile viewports. Screenshots were visually
  inspected. The dialog stayed inside each viewport without horizontal overflow.
- Escape on desktop and Close on mobile paused playback, restored focus, and
  kept the user on the homepage.
- The hero CTA reached `/register`; the explicit XM CTA retained its URL.
- User portal -> Homepage -> Portal retained the session; signed-in `/login`
  returned to the dashboard. An ordinary user could not enter `/admin`.
- Admin portal -> Admin -> Tickets -> Verification -> Homepage -> Portal ->
  Admin retained the session and reached the expected screens.
- Explicit logout restored the logged-out homepage navigation.
- No browser runtime errors occurred.

## Hosted Retest

Deploy this branch (or merge it into the production branch and redeploy), then
repeat the video and navigation checks on Vercel. The Supabase Site URL and
redirect configuration from [the auth fix](auth-confirmation-session-fix.md)
still need to be set for email confirmation. Local browser verification does
not replace that hosted email test or the remaining EA acceptance tests.
