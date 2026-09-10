#ifndef TFP_LICENSE_CLIENT_INCLUDED
#define TFP_LICENSE_CLIENT_INCLUDED

input string TFP_LicenseToken = "";
// Pin the authority: a user-controlled URL could always respond allowed.
const string TFP_LicenseApiUrl = "https://www.tradingfinalpiece.com/api/v1/license/validate";
const string TFP_PortalUrl = "https://www.tradingfinalpiece.com/dashboard";
const string TFP_EaVersion = "1.02";
const int TFP_RecheckSeconds = 300;
const int TFP_RetrySeconds = 60;
bool TFP_LastAllowed=false, TFP_InGrace=false;
ulong TFP_Deadline=0, TFP_NextCheck=0;
string TFP_Identity="", TFP_LastMessage="License has not been checked.", TFP_ReportedMessage="";

ulong TFP_Clock() { return GetMicrosecondCount()/1000000; }
string TFP_Platform()
{
#ifdef __MQL5__
   return "MT5";
#else
   return "MT4";
#endif
}
string TFP_AccountNumber() { return IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)); }
string TFP_AccountKind()
{
   long mode=AccountInfoInteger(ACCOUNT_TRADE_MODE);
   if(mode==ACCOUNT_TRADE_MODE_DEMO) return "demo";
   if(mode==ACCOUNT_TRADE_MODE_REAL) return "live";
   return "unsupported";
}
string TFP_CurrentIdentity()
{
   return TFP_AccountNumber()+"|"+TFP_AccountKind()+"|"+AccountInfoString(ACCOUNT_SERVER)+"|"+
      AccountInfoString(ACCOUNT_COMPANY)+"|"+TFP_Platform()+"|"+TFP_LicenseToken;
}
void TFP_Deny(const string message)
{
   TFP_LastAllowed=false; TFP_InGrace=false; TFP_Deadline=0; TFP_LastMessage=message;
}
void TFP_SyncIdentity()
{
   string identity=TFP_CurrentIdentity();
   if(identity==TFP_Identity) return;
   TFP_Identity=identity; TFP_NextCheck=0;
   TFP_Deny("Account changed. Online validation required.");
}
void TFP_SkipSpace(const string json,int &pos)
{
   while(pos<StringLen(json))
   {
      ushort c=StringGetCharacter(json,pos);
      if(c!=32 && c!=9 && c!=10 && c!=13) break;
      pos++;
   }
}
int TFP_Hex(const ushort c)
{
   if(c>=48 && c<=57) return (int)c-48;
   if(c>=65 && c<=70) return (int)c-55;
   if(c>=97 && c<=102) return (int)c-87;
   return -1;
}
bool TFP_JsonString(const string json,int &pos,string &value)
{
   value="";
   if(StringGetCharacter(json,pos)!=34) return false;
   pos++;
   while(pos<StringLen(json))
   {
      ushort c=StringGetCharacter(json,pos++);
      if(c==34) return true;
      if(c<32) return false;
      if(c==92)
      {
         if(pos>=StringLen(json)) return false;
         c=StringGetCharacter(json,pos++);
         if(c==110) c=10;
         else if(c==114) c=13;
         else if(c==116) c=9;
         else if(c==98) c=8;
         else if(c==102) c=12;
         else if(c==117)
         {
            if(pos+4>StringLen(json)) return false;
            int code=0;
            for(int i=0;i<4;i++)
            {
               int digit=TFP_Hex(StringGetCharacter(json,pos++));
               if(digit<0) return false;
               code=code*16+digit;
            }
            c=(ushort)code;
         }
         else if(c!=34 && c!=92 && c!=47) return false;
      }
      value+=ShortToString(c);
   }
   return false;
}
// Parse the entire flat API object. Reject duplicates, nested values and
// quoted booleans; text containing "allowed":true cannot authorize a trade.
bool TFP_JsonMember(const string json,const string wanted,string &value,string &type)
{
   int pos=0; bool found=false; string keys[];
   value=""; type="";
   TFP_SkipSpace(json,pos);
   if(StringGetCharacter(json,pos++)!=123) return false;
   while(pos<StringLen(json))
   {
      TFP_SkipSpace(json,pos);
      if(StringGetCharacter(json,pos)==125)
      { pos++; TFP_SkipSpace(json,pos); return found && pos==StringLen(json); }
      string key,item,itemType;
      if(!TFP_JsonString(json,pos,key)) return false;
      for(int k=0;k<ArraySize(keys);k++) if(keys[k]==key) return false;
      int count=ArraySize(keys); ArrayResize(keys,count+1); keys[count]=key;
      TFP_SkipSpace(json,pos);
      if(StringGetCharacter(json,pos++)!=58) return false;
      TFP_SkipSpace(json,pos);
      if(StringGetCharacter(json,pos)==34)
      { if(!TFP_JsonString(json,pos,item)) return false; itemType="string"; }
      else
      {
         int start=pos;
         while(pos<StringLen(json))
         {
            ushort c=StringGetCharacter(json,pos);
            if(c==44 || c==125 || c==32 || c==9 || c==10 || c==13) break;
            pos++;
         }
         item=StringSubstr(json,start,pos-start);
         if(item=="true" || item=="false") itemType="bool";
         else if(item=="null") itemType="null";
         else return false;
      }
      if(key==wanted) { found=true; value=item; type=itemType; }
      TFP_SkipSpace(json,pos);
      if(StringGetCharacter(json,pos)==44)
      { pos++; TFP_SkipSpace(json,pos); if(StringGetCharacter(json,pos)==125) return false; }
      else if(StringGetCharacter(json,pos)!=125) return false;
   }
   return false;
}
datetime TFP_ParseUtc(const string value)
{
   int size=StringLen(value);
   if(size!=20 && size!=24) return 0;
   if(StringSubstr(value,4,1)!="-" || StringSubstr(value,7,1)!="-" ||
      StringSubstr(value,10,1)!="T" || StringSubstr(value,13,1)!=":" ||
      StringSubstr(value,16,1)!=":" || StringSubstr(value,size-1)!="Z") return 0;
   for(int i=0;i<size-1;i++)
   {
      if(i==4 || i==7 || i==10 || i==13 || i==16) continue;
      if(i==19 && size==24) { if(StringSubstr(value,i,1)!=".") return 0; continue; }
      ushort c=StringGetCharacter(value,i);
      if(c<48 || c>57) return 0;
   }
   string formatted=StringSubstr(value,0,19);
   StringReplace(formatted,"-","."); StringReplace(formatted,"T"," ");
   datetime parsed=StringToTime(formatted);
   if(TimeToString(parsed,TIME_DATE|TIME_SECONDS)!=formatted) return 0;
   return parsed;
}
bool TFP_ApplyResponse(const string body,const ulong requestStarted)
{
   string allowed,type,status,message;
   if(!TFP_JsonMember(body,"allowed",allowed,type) || type!="bool")
   { TFP_Deny("Invalid license server response."); return false; }
   if(!TFP_JsonMember(body,"status",status,type) || type!="string")
   { TFP_Deny("Invalid license server status."); return false; }
   if(!TFP_JsonMember(body,"message",message,type) || type!="string")
   { TFP_Deny("Invalid license server message."); return false; }
   if(allowed!="true" || status!="active") { TFP_Deny(message); return false; }
   string serverTime,grace,expiry;
   if(!TFP_JsonMember(body,"server_time",serverTime,type) || type!="string")
   { TFP_Deny("License API must be updated before using this EA."); return false; }
   datetime issued=TFP_ParseUtc(serverTime);
   if(!TFP_JsonMember(body,"grace_until",grace,type) || type!="string")
   { TFP_Deny("Invalid license grace deadline."); return false; }
   datetime deadline=TFP_ParseUtc(grace);
   if(!TFP_JsonMember(body,"expires_at",expiry,type) || (type!="null" && type!="string"))
   { TFP_Deny("Missing license expiry."); return false; }
   if(type=="string")
   {
      datetime expires=TFP_ParseUtc(expiry);
      if(expires<=issued) { TFP_Deny("License expired."); return false; }
      if(expires<deadline) deadline=expires;
   }
   else if(TFP_AccountKind()=="demo") { TFP_Deny("Demo license requires an expiry."); return false; }
   if(issued<=0 || deadline<=issued || deadline-issued>48*60*60)
   { TFP_Deny("Invalid license validity window."); return false; }
   // Anchor UTC to elapsed time, not broker/local clocks. Starting before the
   // request conservatively subtracts network delay from the validity window.
   TFP_Deadline=requestStarted+(ulong)(deadline-issued);
   if(TFP_Clock()>=TFP_Deadline) { TFP_Deny("License expired."); return false; }
   TFP_LastAllowed=true; TFP_InGrace=false; TFP_LastMessage=message;
   TFP_NextCheck=TFP_Clock()+TFP_RecheckSeconds;
   return true;
}
bool TFP_UseGrace()
{
   if(TFP_LastAllowed && TFP_Clock()<TFP_Deadline)
   { TFP_InGrace=true; TFP_LastMessage="License service unavailable. Temporary outage grace is active."; return true; }
   TFP_Deny("License service unavailable and no valid outage grace remains.");
   return false;
}
bool TFP_ValidateLicenseOnline()
{
   TFP_SyncIdentity(); TFP_NextCheck=TFP_Clock()+TFP_RetrySeconds;
   if(MQLInfoInteger(MQL_TESTER))
   { TFP_Deny("Licensing requires a connected terminal; Strategy Tester is not supported."); return false; }
   if(AccountInfoInteger(ACCOUNT_LOGIN)<=0 || TFP_AccountKind()=="unsupported")
   { TFP_Deny("Sign into a live or demo MetaTrader account."); return false; }
   if(StringLen(TFP_LicenseToken)!=64)
   { TFP_Deny("Copy your 64-character EA token from the dashboard."); return false; }
   for(int i=0;i<64;i++) if(TFP_Hex(StringGetCharacter(TFP_LicenseToken,i))<0)
   { TFP_Deny("Invalid EA token format."); return false; }
   if(TFP_AccountKind()=="live")
   {
      string company=AccountInfoString(ACCOUNT_COMPANY); StringToLower(company);
      if(StringFind(company,"xm")<0 && StringFind(company,"trading point")<0)
      { TFP_Deny("Live access requires the verified XM broker account."); return false; }
   }
   string payload="{\"account_number\":\""+TFP_AccountNumber()+
      "\",\"account_type\":\""+TFP_AccountKind()+"\",\"platform_type\":\""+TFP_Platform()+
      "\",\"broker_name\":\"XM\",\"ea_product\":\"tfp-edge\",\"ea_version\":\""+
      TFP_EaVersion+"\",\"license_token\":\""+TFP_LicenseToken+"\"}";
   char request[],response[];
   int bytes=StringToCharArray(payload,request,0,WHOLE_ARRAY,CP_UTF8);
   ArrayResize(request,bytes-1);
   string headers; ulong started=TFP_Clock();
   ResetLastError();
   int code=WebRequest("POST",TFP_LicenseApiUrl,"Content-Type: application/json\r\n",5000,request,response,headers);
   if(TFP_CurrentIdentity()!=TFP_Identity) { TFP_SyncIdentity(); return false; }
   if(code==-1 || code==429 || (code>=500 && code<=599))
   {
      bool grace=TFP_UseGrace();
      if(!grace && code==-1)
         TFP_LastMessage="WebRequest failed. Enable https://www.tradingfinalpiece.com in Tools > Options > Expert Advisors and check internet access.";
      return grace;
   }
   if(code!=200) { TFP_Deny("License request denied. Check your token and dashboard status."); return false; }
   return TFP_ApplyResponse(CharArrayToString(response,0,WHOLE_ARRAY,CP_UTF8),started);
}
bool TFP_IsLicenseAllowed()
{
   TFP_SyncIdentity(); ulong now=TFP_Clock();
   if(TFP_LastAllowed && now>=TFP_Deadline) TFP_Deny("License validity expired. Online validation required.");
   if(now>=TFP_NextCheck) return TFP_ValidateLicenseOnline();
   return TFP_LastAllowed && now<TFP_Deadline;
}
void TFP_ReportLicense()
{
   if(TFP_ReportedMessage==TFP_LastMessage) return;
   TFP_ReportedMessage=TFP_LastMessage;
   Print("TFP License: ",TFP_LastMessage);
   if(!TFP_LastAllowed)
      Alert("TFP License: ",TFP_LastMessage," Account #",TFP_AccountNumber(),". ",TFP_PortalUrl);
}
void TFP_LicensePulse() { TFP_IsLicenseAllowed(); TFP_ReportLicense(); }
bool TFP_LicenseStart()
{
   TFP_SyncIdentity();
   if(!EventSetTimer(10))
   { TFP_Deny("Could not start the license timer."); TFP_ReportLicense(); return false; }
   TFP_LicensePulse();
   // Stay attached for existing management and automatic recovery. The caller
   // must gate signal generation and every order-entry path separately.
   return true;
}
void TFP_LicenseStop() { EventKillTimer(); }
#endif
