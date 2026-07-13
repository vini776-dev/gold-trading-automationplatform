//+------------------------------------------------------------------+
//| GTAP_DataBridge.mq5                                              |
//| Writes live account data to a JSON file every second.            |
//| Python engine reads this file — no IPC required.                 |
//+------------------------------------------------------------------+
#property copyright "GTAP Trading Platform"
#property version   "1.00"

#define OUTPUT_FILENAME "gtap_account_data.json"
#define UPDATE_SECONDS  1

//+------------------------------------------------------------------+
int OnInit()
{
   EventSetTimer(UPDATE_SECONDS);
   WriteAccountData();
   Print("GTAP DataBridge started. Writing account data every ", UPDATE_SECONDS, "s");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("GTAP DataBridge stopped.");
}

//+------------------------------------------------------------------+
void OnTimer()
{
   WriteAccountData();
}

void OnTick() { }

//+------------------------------------------------------------------+
void WriteAccountData()
{
   // Build JSON string with live account data
   string json = "{\n";
   json += "  \"accountNumber\": "  + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN))    + ",\n";
   json += "  \"name\": \""         + AccountInfoString(ACCOUNT_NAME)                            + "\",\n";
   json += "  \"server\": \""       + AccountInfoString(ACCOUNT_SERVER)                          + "\",\n";
   json += "  \"company\": \""      + AccountInfoString(ACCOUNT_COMPANY)                         + "\",\n";
   json += "  \"currency\": \""     + AccountInfoString(ACCOUNT_CURRENCY)                        + "\",\n";
   json += "  \"leverage\": "       + IntegerToString((int)AccountInfoInteger(ACCOUNT_LEVERAGE)) + ",\n";
   json += "  \"balance\": "        + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE),     2)  + ",\n";
   json += "  \"equity\": "         + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY),      2)  + ",\n";
   json += "  \"margin\": "         + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN),      2)  + ",\n";
   json += "  \"marginFree\": "     + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2)  + ",\n";
   json += "  \"marginLevel\": "    + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL),2)  + ",\n";
   json += "  \"floatingPnL\": "    + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT),      2)  + ",\n";
   json += "  \"openPositions\": "  + IntegerToString(PositionsTotal())                          + ",\n";
   json += "  \"tradeMode\": "      + IntegerToString((int)AccountInfoInteger(ACCOUNT_TRADE_MODE)) + ",\n";
   json += "  \"tradeAllowed\": "   + (AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) ? "true" : "false") + ",\n";
   json += "  \"timestamp\": "      + IntegerToString((int)TimeCurrent())                        + "\n";
   json += "}";

   // Write to MT5 Common Files directory (accessible outside MT5)
   // Path: C:\Users\<user>\AppData\Roaming\MetaQuotes\Terminal\Common\Files\
   int fh = FileOpen(OUTPUT_FILENAME, FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(fh == INVALID_HANDLE)
   {
      Print("GTAP DataBridge: ERROR opening file (", GetLastError(), ")");
      return;
   }
   FileWriteString(fh, json);
   FileClose(fh);
}
//+------------------------------------------------------------------+
