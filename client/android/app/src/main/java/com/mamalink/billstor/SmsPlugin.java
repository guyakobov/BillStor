package com.mamalink.billstor;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Telephony;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "SmsPlugin",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.READ_SMS }
        )
    }
)
public class SmsPlugin extends Plugin {

    @PluginMethod
    public void readSMS(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestPermissions(call);
            return;
        }

        JSObject ret = new JSObject();
        JSArray messages = new JSArray();

        ContentResolver contentResolver = getContext().getContentResolver();
        Uri smsUri = Uri.parse("content://sms");
        
        // Query for messages
        // Sort by date DESC to get newest first
        Cursor cursor = contentResolver.query(smsUri, null, null, null, "date DESC");

        if (cursor != null && cursor.moveToFirst()) {
            // Limit to top 200 messages to avoid overwhelming the bridge
            int limit = 200; 
            int count = 0;

            do {
                try {
                    String address = cursor.getString(cursor.getColumnIndexOrThrow("address"));
                    String body = cursor.getString(cursor.getColumnIndexOrThrow("body"));
                    String date = cursor.getString(cursor.getColumnIndexOrThrow("date"));
                    String id = cursor.getString(cursor.getColumnIndexOrThrow("_id"));

                    JSObject msg = new JSObject();
                    msg.put("id", id);
                    msg.put("address", address);
                    msg.put("body", body);
                    msg.put("date", date);

                    messages.put(msg);
                    count++;
                } catch (Exception e) {
                    // Ignore errors for individual poor rows
                }
            } while (cursor.moveToNext() && count < limit);

            cursor.close();
        }

        ret.put("messages", messages);
        call.resolve(ret);
    }
}
