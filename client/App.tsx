import React, { useState, useEffect, useRef } from 'react';
import { Search, Folder, MessageSquare, Plus, ArrowRight, Settings, Camera, ShieldCheck, X, Loader2, FileText, Tag, ChevronDown, Check, Mail, Pencil } from 'lucide-react';
import { Receipt, Category, SMSMessage } from './types';
import { KEYWORDS, MOCK_SMS_MESSAGES, getCategoryStyles, DEFAULT_CATEGORIES } from './constants';
import { analyzeReceiptFromText, analyzeReceiptFromImage } from './services/geminiService';
import { requestSmsPermissions, readReceiptSms } from './services/smsService';
import { FolderGrid } from './components/FolderGrid';
import { ReceiptCard } from './components/ReceiptCard';

const simpleId = () => Math.random().toString(36).substring(2, 11);

export default function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [activeTab, setActiveTab] = useState<'folders' | 'scan'>('folders');
  const [viewMode, setViewMode] = useState<'expenses' | 'credits'>('expenses');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // New Folder Modal State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage
  useEffect(() => {
    try {
      const savedReceipts = localStorage.getItem('receipts_data');
      if (savedReceipts) {
        setReceipts(JSON.parse(savedReceipts));
      }

      const savedCategories = localStorage.getItem('categories_data');
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }
    } catch (e) {
      console.error("Local Storage Load Error:", e);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('receipts_data', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('categories_data', JSON.stringify(categories));
  }, [categories]);

  const handlePermission = async () => {
    // Request SMS permissions
    const permissionResult = await requestSmsPermissions();

    if (permissionResult.granted) {
      setPermissionGranted(true);
      setShowPermissionModal(false);
      scanInboxForReceipts();
    } else {
      // Permission denied - show error or fallback
      alert('SMS permissions are required to scan for receipts. Please enable them in settings.');
      setShowPermissionModal(false);
    }
  };

  const handleAddCategory = () => {
    if (newFolderName.trim()) {
      if (!categories.includes(newFolderName.trim())) {
        setCategories([...categories, newFolderName.trim()]);
      }
      setNewFolderName('');
      setShowNewFolderModal(false);
    }
  };

  const handleMoveReceipt = (receiptId: string, newCategory: string) => {
    setReceipts(prev => prev.map(r =>
      r.id === receiptId ? { ...r, category: newCategory } : r
    ));
    if (selectedReceipt && selectedReceipt.id === receiptId) {
      setSelectedReceipt(prev => prev ? { ...prev, category: newCategory } : null);
    }
  };

  const scanInboxForReceipts = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setActiveTab('scan');
    setScanningStatus('סורק הודעות SMS...');

    // Read real SMS messages from device
    const smsResult = await readReceiptSms();

    if (smsResult.error) {
      setScanningStatus(`שגיאה: ${smsResult.error}`);
      setTimeout(() => setIsScanning(false), 3000);
      return;
    }

    const foundMessages = smsResult.messages;
    const newMessages = foundMessages.filter(msg => !receipts.some(r => r.originalSmsBody === msg.body));

    if (newMessages.length === 0) {
      setScanningStatus('לא נמצאו הודעות חדשות');
      setTimeout(() => setIsScanning(false), 2000);
      return;
    }

    setScanningStatus(`נמצאו ${newMessages.length} מסמכים. מפענח...`);

    for (const msg of newMessages) {
      const tempId = simpleId();
      const placeholder: Receipt = {
        id: tempId,
        merchant: msg.sender,
        date: new Date(msg.timestamp).toISOString(),
        amount: 0,
        currency: '₪',
        category: Category.Other,
        originalSmsBody: msg.body,
        isProcessing: true,
        url: msg.body.match(/https?:\/\/[^\s]+/)?.[0],
        type: 'receipt'
      };

      setReceipts(prev => [placeholder, ...prev]);

      try {
        const analysis = await analyzeReceiptFromText(msg.body);

        setReceipts(prev => prev.map(r =>
          r.id === tempId ? { ...r, ...analysis, isProcessing: false } : r
        ));
      } catch (err) {
        console.error(err);
        setReceipts(prev => prev.map(r =>
          r.id === tempId ? { ...r, isProcessing: false, merchant: "שגיאה בפענוח" } : r
        ));
      }
    }

    setScanningStatus('הסריקה הושלמה בהצלחה');
    setTimeout(() => setIsScanning(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanningStatus('מעלה ומפענח תמונה...');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];

      const tempId = simpleId();
      const placeholder: Receipt = {
        id: tempId,
        merchant: 'מעבד תמונה...',
        date: new Date().toISOString(),
        amount: 0,
        currency: '₪',
        category: Category.Other,
        imageUrl: base64String,
        isProcessing: true,
        type: 'receipt'
      };

      setReceipts(prev => [placeholder, ...prev]);

      try {
        const analysis = await analyzeReceiptFromImage(base64Content);
        setReceipts(prev => prev.map(r =>
          r.id === tempId ? { ...r, ...analysis, isProcessing: false } : r
        ));
      } catch (error) {
        setReceipts(prev => prev.map(r =>
          r.id === tempId ? { ...r, isProcessing: false, merchant: 'שגיאה בתמונה' } : r
        ));
      }
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const displayReceipts = receipts.filter(r => {
    const isCorrectType = viewMode === 'expenses' ? r.type !== 'credit' : r.type === 'credit';
    const matchesSearch = (r.merchant || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.amount || 0).toString().includes(searchQuery);
    const matchesCategory = selectedCategory ? r.category === selectedCategory : true;

    if (viewMode === 'credits') {
      return isCorrectType && matchesSearch;
    }
    return isCorrectType && matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative" dir="rtl">

      {/* --- New Folder Modal --- */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">יצירת תיקייה חדשה</h3>
            <input
              type="text"
              autoFocus
              placeholder="שם התיקייה..."
              className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNewFolderModal(false)} className="flex-1 py-3 text-gray-500 font-medium active:bg-gray-50 rounded-xl">ביטול</button>
              <button onClick={handleAddCategory} disabled={!newFolderName.trim()} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50">צור תיקייה</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Permission Modal --- */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ארגון חשבוניות וזיכויים</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                האפליקציה תסרוק אוטומטית הודעות SMS כדי לארגן חשבוניות וזיכויים במקום אחד בטוח.
              </p>
            </div>
            <button
              onClick={handlePermission}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              אפשר גישה והתחל
            </button>
          </div>
        </div>
      )}

      {/* --- Detail Modal --- */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[80vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-700">{selectedReceipt.type === 'credit' ? 'פרטי זיכוי' : 'פרטי קבלה'}</h3>
              <button onClick={() => setSelectedReceipt(null)} className="p-2 bg-white rounded-full shadow-sm"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-center">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl ${selectedReceipt.type === 'credit' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                {selectedReceipt.type === 'credit' ? '🏷️' : '📄'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedReceipt.merchant}</h2>
              <p className={`text-3xl font-mono font-medium ${selectedReceipt.type === 'credit' ? 'text-amber-600' : 'text-blue-600'}`}>
                {selectedReceipt.amount} {selectedReceipt.currency}
              </p>
              <div className="space-y-4 bg-gray-50 p-4 rounded-xl text-sm">
                <div className="flex justify-between"><span>תאריך</span><span className="font-medium">{new Date(selectedReceipt.date).toLocaleDateString('he-IL')}</span></div>
                <div className="flex justify-between items-center">
                  <span>קטגוריה</span>
                  <select
                    value={selectedReceipt.category}
                    onChange={(e) => handleMoveReceipt(selectedReceipt.id, e.target.value)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              {selectedReceipt.imageUrl && <img src={selectedReceipt.imageUrl} className="w-full rounded-xl mt-4" alt="Receipt" />}
            </div>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 pb-2 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          {selectedCategory ? (
            <button onClick={() => setSelectedCategory(null)} className="flex items-center text-gray-600 gap-1"><ArrowRight className="w-5 h-5" /><span className="font-bold">חזרה</span></button>
          ) : (
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">הארנק שלי</h1>
          )}
          <Settings className="w-6 h-6 text-gray-400" />
        </div>

        {!selectedCategory && (
          <div className="flex p-1 bg-gray-100 rounded-xl mb-3">
            <button onClick={() => setViewMode('expenses')} className={`flex-1 py-1.5 text-sm font-bold rounded-lg ${viewMode === 'expenses' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>הוצאות</button>
            <button onClick={() => setViewMode('credits')} className={`flex-1 py-1.5 text-sm font-bold rounded-lg ${viewMode === 'credits' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500'}`}>זיכויים</button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="חפש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none"
          />
        </div>
      </header>

      {/* --- Main --- */}
      <main className="p-4 space-y-6">
        {isScanning && (
          <div className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">{scanningStatus}</span>
          </div>
        )}

        {!selectedCategory && viewMode === 'expenses' && activeTab === 'folders' && (
          <FolderGrid
            receipts={receipts.filter(r => r.type !== 'credit')}
            categories={categories}
            onSelectCategory={setSelectedCategory}
            onAddFolder={() => setShowNewFolderModal(true)}
            onRenameFolder={() => { }}
            onEmailFolder={() => { }}
          />
        )}

        {(selectedCategory || viewMode === 'credits') && (
          <div className="space-y-3">
            {displayReceipts.map(r => <ReceiptCard key={r.id} receipt={r} onClick={setSelectedReceipt} />)}
            {displayReceipts.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">אין פריטים להצגה</p>}
          </div>
        )}
      </main>

      <div className="fixed bottom-24 left-6 z-20">
        <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center"><Camera className="w-6 h-6" /></button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30 pb-safe">
        <button onClick={() => { setActiveTab('folders'); setSelectedCategory(null); }} className={`flex flex-col items-center gap-1 ${activeTab === 'folders' ? 'text-blue-600' : 'text-gray-400'}`}>
          <Folder className="w-6 h-6" /><span className="text-[10px] font-medium">ראשי</span>
        </button>
        <button
          onClick={scanInboxForReceipts}
          className={`flex flex-col items-center gap-1 ${activeTab === 'scan' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <MessageSquare className={`w-6 h-6 ${activeTab === 'scan' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">סריקת SMS</span>
        </button>
      </nav>
    </div>
  );
}