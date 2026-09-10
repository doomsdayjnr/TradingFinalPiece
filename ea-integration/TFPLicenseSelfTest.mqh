// Standalone script tests only: no WebRequest, no order operations, no EA attach.
int TFP_TestPassed=0, TFP_TestFailed=0;
void TFP_Assert(const bool condition,const string name)
{
   if(condition) { TFP_TestPassed++; Print("PASS: ",name); }
   else { TFP_TestFailed++; Print("FAIL: ",name); }
}
void TFP_RunSelfTests()
{
   string value,type;
   TFP_Assert(TFP_JsonMember("{ \"allowed\" : true }","allowed",value,type) &&
      value=="true" && type=="bool","whitespace and typed boolean");
   TFP_Assert(TFP_JsonMember("{\"allowed\":\"true\"}","allowed",value,type) &&
      type=="string","quoted true is not a boolean");
   TFP_Assert(!TFP_JsonMember("{\"allowed\":false,\"allowed\":true}","allowed",value,type),"duplicate field rejected");
   TFP_Assert(!TFP_JsonMember("{\"allowed\":true,}","allowed",value,type),"trailing comma rejected");
   TFP_Assert(!TFP_JsonMember("{\"allowed\":true}junk","allowed",value,type),"trailing data rejected");
   TFP_Assert(!TFP_JsonMember("{\"allowed\":true","allowed",value,type),"truncated object rejected");
   TFP_Assert(!TFP_JsonMember("{\"nested\":{\"allowed\":true}}","allowed",value,type),"nested boolean cannot authorize");
   TFP_Assert(TFP_JsonMember("{\"message\":\"say \\\"hello\\\" \\u0041\"}","message",value,type) &&
      value=="say \"hello\" A","JSON escapes decoded");
   TFP_Assert(TFP_ParseUtc("2026-09-10T12:00:00.000Z")>0,"ISO UTC milliseconds parsed");
   TFP_Assert(TFP_ParseUtc("2026-09-10T12:00:00Z")>0,"ISO UTC seconds parsed");
   TFP_Assert(TFP_ParseUtc("2026-99-10T12:00:00.000Z")==0,"invalid date rejected");
   TFP_Assert(TFP_ParseUtc("2026-09-10T12:00:00+02:00")==0,"non-UTC deadline rejected");
   string accepted="{\"allowed\":true,\"status\":\"active\",\"message\":\"Active\","
      "\"server_time\":\"2026-09-10T12:00:00.000Z\",\"grace_until\":\"2026-09-12T12:00:00.000Z\","
      "\"expires_at\":\"2026-09-10T13:00:00.000Z\"}";
   ulong start=TFP_Clock();
   TFP_Assert(TFP_ApplyResponse(accepted,start),"valid response accepted");
   TFP_Assert(TFP_Deadline==start+3600,"expiry caps grace using elapsed time");
   TFP_Assert(TFP_UseGrace() && TFP_InGrace,"previous success allows bounded outage grace");
   TFP_Assert(!TFP_ApplyResponse("{\"allowed\":false,\"status\":\"revoked\",\"message\":\"Revoked\"}",start),"explicit revocation denied");
   TFP_Assert(!TFP_UseGrace(),"revocation clears cached grace");
   TFP_Assert(!TFP_ApplyResponse("{\"allowed\":\"true\",\"status\":\"active\",\"message\":\"Active\"}",start),"quoted allowance rejected");
   string expired=accepted;
   StringReplace(expired,"2026-09-10T13:00:00.000Z","2026-09-10T11:00:00.000Z");
   TFP_Assert(!TFP_ApplyResponse(expired,start),"expired response denied");
   TFP_LastAllowed=true; TFP_Deadline=0;
   TFP_Assert(!TFP_UseGrace(),"elapsed grace cannot be renewed by outage");
   TFP_LastAllowed=true; TFP_Deadline=TFP_Clock()+3600; TFP_Identity="a-different-account";
   TFP_SyncIdentity();
   TFP_Assert(!TFP_LastAllowed && TFP_Deadline==0,"identity change clears authorization");
   TFP_Deny("Self-test completed. No trades or network requests were made.");
   Print("TFP SELF TEST: ",TFP_TestPassed," passed, ",TFP_TestFailed," failed.");
}
