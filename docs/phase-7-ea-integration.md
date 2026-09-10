# Phase 7 EA License Integration

## Current Status

Both private TFP Edge source files have been integrated and compiled as version
1.02. MT4 and MT5 each compiled with zero errors and zero warnings on 2026-09-10.
The original strategy sources remain outside the public repository, with backups
in the private source folder's `originals-before-licensing` directory.

This is compile verification, not terminal acceptance testing. See
[the integration verification record](phase-7-integration-verification.md).

## Runtime Behavior

- The only license input is `TFP_LicenseToken`, copied from the portal.
- The compiled authority is
  `https://www.tradingfinalpiece.com/api/v1/license/validate`.
  The endpoint is not user-editable, so an arbitrary server cannot grant access.
- Account number (including large MT5 logins), platform, actual live/demo mode,
  server, and company come from the terminal. Contest mode is denied.
- Live mode additionally requires an XM/Trading Point company identity.
  Confirm actual XM entity names during broker testing.
- Validation occurs at initialization, then every five minutes, with a ten-second
  timer and one-minute retry delay after failures. WebRequest has a five-second
  timeout. Checks also guard signal generation and the shared order-entry function,
  covering both confirmation and automatic modes.
- Changed account/server/company/mode/token invalidates previous permission.
- Expiry is checked before new entries, regardless of the next scheduled request.
- Explicit online denial, malformed success responses, or authentication errors
  clear permission. HTTP 429, HTTP 5xx, and network failures can use an existing,
  unexpired in-memory grant.
- Grace is at most 48 hours, capped by the license/trial expiry. UTC deadlines are
  converted into elapsed-time limits, independent of broker time and local clock.
- Status changes are logged; repeated identical messages do not repeatedly alert.
- The EA remains attached when unlicensed so management controls and recovery
  continue. Signals/new trades remain blocked until validation succeeds.
- Intentional manual-trade closing across account symbols remains unchanged,
  as confirmed by the project owner. Licensing does not itself trigger liquidation.

## Restart Limitation

The grant is held only in memory. Restarting the terminal, reattaching the EA,
or reinitializing it requires a successful online check. No unsigned disk cache
is trusted. Persistent offline restart support remains outside this implementation;
it would require a separately verified signed grant. Record this as an explicit
deviation from the original persistent-cache expectation, not a passed restart
grace test. Existing positions remain subject to the original EA management logic.

The five-minute online interval means a new server-side suspension may take up
to that interval to reach an online EA. During an outage, revocation cannot be
learned until connectivity returns or the existing grant expires.

## Private Build Layout

```text
TradingFinalPiece-EA-Private/
  originals-before-licensing/
    tfp_edge.mq4
    tfp_edge.mq5
  MT4/
    tfp_edge.mq4
    TFPLicenseClient.mqh
    tfp_edge.ex4
    compile.log
    TFPLicenseSelfTest.mq4
    TFPLicenseSelfTest.mqh
    TFPLicenseSelfTest.ex4
    selftest-compile.log
  MT5/
    tfp_edge.mq5
    TFPLicenseClient.mqh
    tfp_edge.ex5
    compile.log
    TFPLicenseSelfTest.mq5
    TFPLicenseSelfTest.mqh
    TFPLicenseSelfTest.ex5
    selftest-compile.log
```

The canonical shared helper is [TFPLicenseClient.mqh](../ea-integration/TFPLicenseClient.mqh).
Copy it directly alongside each private EA source. The old platform subfolders
contain compatibility wrappers for integrations preserving that relative layout.
Whenever the common helper changes, recopy it and recompile both private EAs.

Never commit the private strategy files. Only the shared licensing code, tests,
and documentation belong in this public repository.

## Deployment And Terminal Test Order

1. Deploy the website branch containing these API updates with the existing
   Supabase configuration/migrations. The new EAs require `server_time` and
   `expires_at` in successful API responses.
2. Connect `www.tradingfinalpiece.com` to that deployment and verify HTTPS.
   The domain did not resolve from the development environment on 2026-09-10.
   A healthy `/api/health` alone does not prove database connectivity.
3. Validate an actual test license through the deployed API. Confirm allowed,
   denied, expiry and matching-platform behavior.
4. Run the standalone `TFPLicenseSelfTest` scripts in isolated test terminals.
   Place each compiled script under the terminal data folder's MQL4/MQL5
   `Scripts` directory, refresh Navigator and run it. Inspect Experts/Journal
   for the pass/fail summary. These scripts do not send requests or place trades.
   They were compiled here but have not been executed.
5. Install each private compiled EA under the test terminal's `Experts` folder.
   Enable WebRequest for `https://www.tradingfinalpiece.com`. Paste the appropriate
   portal token. Use isolated test accounts, not accounts with real positions.
6. Run the EA cases in [Project Testing Flow](project-testing-flow.md), separately
   on MT4 and MT5. Include confirmation and auto-entry modes, account changes,
   expiry, denial, network errors, and HTTP 5xx. Validate management behavior
   with the intentional manual-trade restriction in mind.
7. Only after the endpoint and terminal checks pass, upload `tfp_edge.ex4` to
   `ea-downloads/tfp-edge/mt4/tfp-edge.ex4` and `tfp_edge.ex5` to
   `ea-downloads/tfp-edge/mt5/tfp-edge.ex5` (or the configured override paths).
   Keep the original downloadable files backed up before replacement.
8. Download both through the portal and confirm hashes match the tested private
   builds. Then run the remaining full website acceptance flow.

Do not use Strategy Tester as evidence of WebRequest behavior: the production
helper denies that environment. Real connected-terminal tests are required.
MetaQuotes documents the WebRequest restrictions and synchronous behavior in
[the official reference](https://www.mql5.com/en/docs/network/webrequest).
