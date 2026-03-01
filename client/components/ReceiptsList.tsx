import React, { useState, useEffect } from 'react';
import { SmsPlugin } from '../services/smsService';

interface SmsMessage {
    address: string;
    body: string;
    date: number;
}

export function ReceiptsList({ onProcessAll }: { onProcessAll?: () => void }) {
    const [messages, setMessages] = useState<SmsMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMessages();
    }, []);

    async function loadMessages() {
        try {
            setLoading(true);

            console.log('📱 Loading SMS messages...');

            const result = await SmsPlugin.readSMS();
            console.log('📨 Total SMS:', result.messages?.length);

            if (!result.messages) {
                setMessages([]);
                return;
            }

            // Simple filter: Only messages containing "קבלה"
            const filtered = result.messages.filter(msg =>
                (msg.body || '').includes('קבלה')
            );

            console.log('✅ Messages with "קבלה":', filtered.length);

            // Map to our local interface
            const mapped = filtered.map(msg => ({
                address: msg.address,
                body: msg.body,
                date: parseInt(msg.date)
            }));

            setMessages(mapped);

        } catch (error) {
            console.error('❌ Error loading messages:', error);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="text-center py-10 text-gray-500">טוען הודעות...</div>;
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-gray-500">
                <p className="mb-4">לא נמצאו הודעות קבלה</p>
                <button
                    onClick={loadMessages}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow-sm hover:bg-blue-700"
                >
                    🔄 רענן
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 space-y-4 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-xl font-bold text-gray-800">נמצאו {messages.length} הודעות</h2>
                <div className="flex gap-2">
                    {onProcessAll && (
                        <button
                            onClick={onProcessAll}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-green-700 flex items-center gap-1"
                        >
                            ➕ הוסף לארנק
                        </button>
                    )}
                    <button
                        onClick={loadMessages}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 flex items-center gap-1"
                    >
                        🔄 רענן
                    </button>
                </div>
            </div>

            {messages.map((msg, index) => (
                <div key={`${msg.address}-${msg.date}-${index}`} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50">
                        <span className="font-bold text-gray-800 dir-ltr">{msg.address}</span>
                        <span className="text-xs text-gray-400">
                            {new Date(msg.date).toLocaleDateString('he-IL', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>

                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words dir-auto">
                        {/* Auto-link URLs */}
                        {msg.body.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                            part.match(/https?:\/\/[^\s]+/) ? (
                                <a
                                    key={i}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                >
                                    {part}
                                </a>
                            ) : (
                                <span key={i}>{part}</span>
                            )
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
