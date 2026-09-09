#property strict

input string TFP_LicenseApiUrl = "https://your-domain.com/api/v1/license/validate";
input string TFP_LicenseToken = "";
input string TFP_AccountType = "live";
input string TFP_BrokerName = "XM";
input string TFP_EaProduct = "tfp-edge";
input string TFP_EaVersion = "1.0.0";

datetime TFP_GraceUntil = 0;
datetime TFP_LastCheckAt = 0;
bool TFP_LastAllowed = false;
string TFP_LastMessage = "";

string TFP_EscapeJson(string value)
{
   string escaped = value;
   StringReplace(escaped, "\\", "\\\\");
   StringReplace(escaped, "\"", "\\\"");
   return escaped;
}

string TFP_ReadJsonString(string json, string key)
{
   string marker = "\"" + key + "\":";
   int keyPos = StringFind(json, marker);
   if(keyPos < 0)
      return "";

   int quoteStart = StringFind(json, "\"", keyPos + StringLen(marker));
   if(quoteStart < 0)
      return "";

   int quoteEnd = StringFind(json, "\"", quoteStart + 1);
   if(quoteEnd < 0)
      return "";

   return StringSubstr(json, quoteStart + 1, quoteEnd - quoteStart - 1);
}

bool TFP_ReadJsonBool(string json, string key)
{
   string marker = "\"" + key + "\":true";
   return StringFind(json, marker) >= 0;
}

string TFP_Platform()
{
   return "MT5";
}

string TFP_BuildPayload()
{
   return "{"
      + "\"account_number\":\"" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + "\","
      + "\"account_type\":\"" + TFP_EscapeJson(TFP_AccountType) + "\","
      + "\"platform_type\":\"" + TFP_Platform() + "\","
      + "\"broker_name\":\"" + TFP_EscapeJson(TFP_BrokerName) + "\","
      + "\"ea_product\":\"" + TFP_EscapeJson(TFP_EaProduct) + "\","
      + "\"ea_version\":\"" + TFP_EscapeJson(TFP_EaVersion) + "\","
      + "\"license_token\":\"" + TFP_EscapeJson(TFP_LicenseToken) + "\""
      + "}";
}

bool TFP_ValidateLicenseOnline()
{
   if(StringLen(TFP_LicenseToken) < 16)
   {
      TFP_LastMessage = "License token missing. Copy your EA token from the Trading Final Piece dashboard.";
      TFP_LastAllowed = false;
      return false;
   }

   string headers = "Content-Type: application/json\r\n";
   string responseHeaders = "";
   char postData[];
   char responseData[];
   string payload = TFP_BuildPayload();
   StringToCharArray(payload, postData, 0, StringLen(payload));

   ResetLastError();
   int status = WebRequest("POST", TFP_LicenseApiUrl, headers, 10000, postData, responseData, responseHeaders);

   if(status == -1)
   {
      int errorCode = GetLastError();
      if(TFP_LastAllowed && TFP_GraceUntil > TimeCurrent())
      {
         TFP_LastMessage = "License API unavailable. Running under temporary grace period.";
         return true;
      }

      TFP_LastMessage = "WebRequest failed. In MT5, enable WebRequest and add your Trading Final Piece domain. Error: " + IntegerToString(errorCode);
      TFP_LastAllowed = false;
      return false;
   }

   string body = CharArrayToString(responseData);
   bool allowed = TFP_ReadJsonBool(body, "allowed");
   string message = TFP_ReadJsonString(body, "message");
   string graceUntil = TFP_ReadJsonString(body, "grace_until");

   TFP_LastCheckAt = TimeCurrent();
   TFP_LastAllowed = allowed;
   TFP_LastMessage = message;

   if(allowed && StringLen(graceUntil) > 0)
      TFP_GraceUntil = StringToTime(StringSubstr(graceUntil, 0, 19));

   return allowed;
}

bool TFP_IsLicenseAllowed()
{
   if(TFP_LastAllowed && TFP_LastCheckAt > 0 && TimeCurrent() - TFP_LastCheckAt < 3600)
      return true;

   return TFP_ValidateLicenseOnline();
}

void TFP_ShowUnauthorizedMessage()
{
   string message =
      "--------------------------------------------------\n"
      " UNAUTHORIZED ACCOUNT / LICENSE EXPIRED\n"
      "--------------------------------------------------\n"
      " Account #" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + " is not verified under our partner link.\n\n"
      " HOW TO UNLOCK THIS EA:\n"
      " 1. Visit: https://your-domain.com/dashboard\n"
      " 2. Register/Link your MT4 or MT5 account under our IB code.\n"
      " 3. Submit Account #" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + " on your dashboard.\n\n"
      " " + TFP_LastMessage + "\n"
      "--------------------------------------------------";

   Alert(message);
   Print(message);
}
