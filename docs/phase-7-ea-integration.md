# Phase 7 EA License Integration

The actual `.mq4` and `.mq5` EA source files are not in this repository yet, so Phase 7 provides ready-to-integrate license client includes and the exact insertion points for the EA developer.

Files:

```text
ea-integration/mt4/TFPLicenseClient.mqh
ea-integration/mt5/TFPLicenseClient.mqh
```

## Required EA Changes

Add the matching include to the EA source:

```mql
#include "TFPLicenseClient.mqh"
```

At startup, block initialization when the first online validation fails:

```mql
int OnInit()
{
   if(!TFP_ValidateLicenseOnline())
   {
      TFP_ShowUnauthorizedMessage();
      return INIT_FAILED;
   }

   return INIT_SUCCEEDED;
}
```

Before opening new trades, call:

```mql
if(!TFP_IsLicenseAllowed())
{
   TFP_ShowUnauthorizedMessage();
   return;
}
```

Do not close existing trades only because the API is unavailable. The helper allows a previously validated account to keep running while `grace_until` is still active.

## EA Inputs

The compiled EA should expose:

```text
TFP_LicenseApiUrl
TFP_LicenseToken
TFP_AccountType
TFP_BrokerName
TFP_EaProduct
TFP_EaVersion
```

Production `TFP_LicenseApiUrl` must be:

```text
https://your-domain.com/api/v1/license/validate
```

Replace `your-domain.com` after Vercel/domain setup.

## MetaTrader WebRequest Setup

Users must enable WebRequest and add the production domain:

```text
Tools -> Options -> Expert Advisors -> Allow WebRequest for listed URL
```

Add:

```text
https://your-domain.com
```

## Expected Behaviors

- Live verified with matching token/platform: allowed.
- Live pending: denied with pending message.
- Live rejected: denied with rejected message.
- Live suspended/revoked: denied and no new trades should open.
- Demo active with matching token/platform: allowed.
- Demo expired: denied with expired message.
- Unknown account: denied and user is told to submit account in dashboard.
- API unavailable after previous success: allow only during grace period.
- API unavailable on first run: deny.
- Different MetaTrader account number: deny unless separately verified or covered by active demo access.

## Compile Checklist

- Copy the MT4 include into the MT4 EA project include path.
- Copy the MT5 include into the MT5 EA project include path.
- Add startup and pre-trade checks.
- Compile `.mq4` into `.ex4`.
- Compile `.mq5` into `.ex5`.
- Upload compiled binaries only to Supabase Storage.
- Keep source files private.
