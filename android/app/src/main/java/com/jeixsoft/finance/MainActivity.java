package com.jeixsoft.finance;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.jeixsoft.finance.notifications.BankNotificationsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BankNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
