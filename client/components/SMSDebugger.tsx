import React, { useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

// Define the custom plugin interface locally for the debugger
interface SmsPlugin {
    readSMS(): Promise<{ messages: any[] }>;
    checkPermissions(): Promise<{ sms: string }>;
    requestPermissions(): Promise<{ sms: string }>;
}

const SmsPlugin = registerPlugin<SmsPlugin>('SmsPlugin');

export function SMSDebugger() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const addLog = (msg: string) => {
        console.log(msg);
        setLogs(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev]);
    };

    async function runFullDiagnostic() {
        setLogs([]);
        addLog('🚀 Starting Diagnostic...');

        // 1. Platform check
        const platform = Capacitor.getPlatform();
        addLog(`📱 Platform: ${platform}`);

        if (platform !== 'android') {
            addLog('❌ Not Android - SMS likely not supported');
            // proceed anyway for testing in browser (will fail at plugin call)
        }

        // 2. Check permissions
        try {
            addLog('Checking permissions...');
            const permStatus = await SmsPlugin.checkPermissions();
            addLog(`📋 Permissions: ${JSON.stringify(permStatus)}`);

            if (permStatus.sms !== 'granted') {
                addLog('🔐 Requesting permissions...');
                const result = await SmsPlugin.requestPermissions();
                addLog(`📋 Permission result: ${JSON.stringify(result)}`);
            }
        } catch (err: any) {
            addLog(`❌ Permission check failed: ${err.message}`);
        }

        // 3. Try to read SMS
        try {
            addLog('📨 Calling SmsPlugin.readSMS()...');
            const result = await SmsPlugin.readSMS();

            addLog(`✅ Raw Result keys: ${Object.keys(result).join(', ')}`);
            const msgs = result.messages || [];
            addLog(`📊 Total messages returned: ${msgs.length}`);

            if (msgs.length > 0) {
                // Show first 3 messages
                msgs.slice(0, 3).forEach((msg: any, idx: number) => {
                    addLog(`--- Msg ${idx + 1} ---`);
                    addLog(`From: ${msg.address || msg.sender}`);
                    addLog(`Body: ${(msg.body || '').substring(0, 50)}...`);
                    addLog(`Date: ${msg.date}`);
                });

                // Check filtering
                const keywords = ['קבלה', 'חשבונית', 'receipt', 'invoice'];
                const withKeyword = msgs.filter((m: any) => {
                    const body = (m.body || '').toLowerCase();
                    return keywords.some(k => body.includes(k));
                });
                addLog(`🧾 Messages matching keywords: ${withKeyword.length}`);
            } else {
                addLog('⚠️ No messages found in the result array.');
            }

        } catch (err: any) {
            addLog(`❌ Failed to read SMS: ${err.message}`);
            addLog(`Error details: ${JSON.stringify(err)}`);
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-50 bg-red-600 text-white rounded-full p-3 shadow-lg font-bold text-xs"
            >
                🐞 Debug
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/90 text-green-400 p-4 font-mono text-sm overflow-hidden flex flex-col" dir="ltr">
            <div className="flex justify-between items-center mb-4 border-b border-green-800 pb-2">
                <h3 className="font-bold text-lg">SMS Debugger</h3>
                <button
                    onClick={() => setIsOpen(false)}
                    className="bg-red-900/50 text-red-200 px-3 py-1 rounded"
                >
                    Close
                </button>
            </div>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={runFullDiagnostic}
                    className="flex-1 bg-green-700 text-black font-bold py-2 rounded hover:bg-green-600"
                >
                    ▶ Run Diagnostic
                </button>
                <button
                    onClick={() => setLogs([])}
                    className="px-4 border border-green-700 rounded hover:bg-green-900/30"
                >
                    Clear
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-black border border-green-900 rounded p-2 text-xs space-y-1">
                {logs.length === 0 ? (
                    <div className="text-gray-500 italic text-center mt-10">Run diagnostic to see logs...</div>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className="break-words border-b border-green-900/30 pb-1">
                            {log}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
