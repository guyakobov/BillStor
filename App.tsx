import React, { useState, useEffect, useRef } from 'react';
import { Receipt, Category, SMSMessage } from './types';
import { KEYWORDS, MOCK_SMS_MESSAGES, getCategoryStyles, DEFAULT_CATEGORIES } from './constants';
import { analyzeReceiptFromText, analyzeReceiptFromImage } from './services/geminiService';
import { FolderGrid } from './components/FolderGrid';
import { ReceiptCard } from './components/ReceiptCard';
import { Search, Folder, MessageSquare, Plus, ArrowRight, Settings, Camera, ShieldCheck, X, Loader2, FileText, Tag, ChevronDown, Check } from 'lucide-react';

const simpleId = () => Math.random().toString(36).substr(2, 9);

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
    const savedReceipts = localStorage.getItem('receipts_data');
    if (savedReceipts) {
      setReceipts(JSON.parse(savedReceipts));
    }

    const savedCategories = localStorage.getItem('categories_data');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('receipts_data', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('categories_data', JSON.stringify(categories));
  }, [categories]);

  const handlePermission = () => {
    setPermissionGranted(true);
    setShowPermissionModal(false);
    simulateInboxScan();
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
    // If we are looking at the specific receipt, update it too
    if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt(prev => prev ? { ...prev, category: newCategory } : null);
    }
  };

  const simulateInboxScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setActiveTab('scan');
    setScanningStatus('סורק הודעות SMS...');

    const foundMessages = MOCK_SMS_MESSAGES.filter(msg => 
      KEYWORDS.some(k => msg.body.includes(k))
    );

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
    const matchesSearch = r.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.amount.toString().includes(searchQuery);
    const matchesCategory = selectedCategory ? r.category === selectedCategory : true;
    
    if (viewMode === 'credits') {
        return isCorrectType && matchesSearch;
    }
    return isCorrectType && matchesSearch && matchesCategory;
  });

  const getReceiptStyles = (r: Receipt) => {
      const { colorClass } = getCategoryStyles(r.category);
      return r.type === 'credit' ? { bg: 'bg-amber-100', text: 'text-amber-600' } : { bg: 'bg-gray-100', text: colorClass };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      
      {/* --- New Folder Modal --- */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
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
               <button 
                 onClick={() => setShowNewFolderModal(false)}
                 className="flex-1 py-3 text-gray-500 font-medium active:bg-gray-50 rounded-xl"
               >
                 ביטול
               </button>
               <button 
                 onClick={handleAddCategory}
                 disabled={!newFolderName.trim()}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
               >
                 צור תיקייה
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- Permission Modal (Onboarding) --- */}
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

      {/* --- Receipt Detail Modal --- */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[80vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
             
             {/* Header */}
             <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-700">
                    {selectedReceipt.type === 'credit' ? 'פרטי זיכוי' : 'פרטי קבלה'}
                </h3>
                <button onClick={() => setSelectedReceipt(null)} className="p-2 bg-white rounded-full shadow-sm">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
             </div>

             {/* Content */}
             <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="text-center space-y-2">
                  <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl ${selectedReceipt.type === 'credit' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                     {selectedReceipt.type === 'credit' ? '🏷️' : 
                      selectedReceipt.category === Category.Shopping ? '🛍️' : 
                      selectedReceipt.category === Category.Food ? '🍔' : '📄'}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedReceipt.merchant}</h2>
                  <p className={`text-3xl font-mono font-medium ${selectedReceipt.type === 'credit' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {selectedReceipt.amount} {selectedReceipt.currency}
                  </p>
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-xl text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">תאריך הנפקה</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedReceipt.date).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                    
                    {selectedReceipt.expirationDate && (
                      <div className="flex justify-between bg-white p-2 rounded border border-amber-100">
                        <span className="text-amber-600 font-bold">בתוקף עד</span>
                        <span className="font-bold text-amber-700">
                          {new Date(selectedReceipt.expirationDate).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">קטגוריה</span>
                      <div className="relative">
                        <select 
                          value={selectedReceipt.category}
                          onChange={(e) => handleMoveReceipt(selectedReceipt.id, e.target.value)}
                          className="appearance-none bg-blue-100 text-blue-700 pl-8 pr-3 py-1 rounded text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-blue-700 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    
                    {selectedReceipt.originalSmsBody && (
                       <div className="pt-2 border-t border-gray-200">
                         <span className="block text-gray-500 mb-1">מקור (SMS)</span>
                         <p className="text-gray-600 italic text-xs leading-relaxed bg-white p-2 rounded border border-gray-100">
                           "{selectedReceipt.originalSmsBody}"
                         </p>
                       </div>
                    )}
                </div>

                {selectedReceipt.url && (
                  <a 
                    href={selectedReceipt.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full text-center bg-gray-900 text-white py-3 rounded-xl font-medium"
                  >
                    פתח מסמך מקור
                  </a>
                )}
                 {selectedReceipt.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                        <img src={selectedReceipt.imageUrl} alt="Receipt Scan" className="w-full h-auto object-cover" />
                    </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* --- Main Header --- */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 pb-2 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          {selectedCategory ? (
             <button onClick={() => setSelectedCategory(null)} className="flex items-center text-gray-600 gap-1">
               <ArrowRight className="w-5 h-5" />
               <span className="font-bold">חזרה לתיקיות</span>
             </button>
          ) : (
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">הארנק שלי</h1>
          )}
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
        </div>

        {/* View Toggle (Receipts vs Credits) */}
        {!selectedCategory && (
            <div className="flex p-1 bg-gray-100 rounded-xl mb-3">
                <button 
                    onClick={() => setViewMode('expenses')}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'expenses' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                    הוצאות
                </button>
                <button 
                    onClick={() => setViewMode('credits')}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'credits' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500'}`}
                >
                    זיכויים
                </button>
            </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder={viewMode === 'expenses' ? "חפש הוצאה..." : "חפש זיכוי..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
      </header>

      {/* --- Content Area --- */}
      <main className="p-4 space-y-6">
        
        {isScanning && (
          <div className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-blue-200 animate-pulse">
             <Loader2 className="w-5 h-5 animate-spin" />
             <span className="text-sm font-medium">{scanningStatus}</span>
          </div>
        )}

        {/* FOLDERS VIEW */}
        {!selectedCategory && viewMode === 'expenses' && activeTab === 'folders' && (
          <section>
            <FolderGrid 
              receipts={receipts.filter(r => r.type !== 'credit')} 
              categories={categories}
              onSelectCategory={setSelectedCategory} 
              onAddFolder={() => setShowNewFolderModal(true)}
            />
          </section>
        )}

        {/* LIST VIEW */}
        {(selectedCategory || viewMode === 'credits') && (
            <section>
            <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-lg font-bold text-gray-800">
                {viewMode === 'credits' ? 'זיכויים זמינים' : selectedCategory}
                </h2>
            </div>

            <div className="space-y-3">
                {displayReceipts.length > 0 ? (
                    displayReceipts.map(r => (
                    <ReceiptCard key={r.id} receipt={r} onClick={setSelectedReceipt} />
                    ))
                ) : (
                <div className="text-center py-10 text-gray-400">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${viewMode === 'credits' ? 'bg-amber-50' : 'bg-gray-100'}`}>
                    {viewMode === 'credits' ? <Tag className="w-8 h-8 text-amber-300" /> : <FileText className="w-8 h-8 text-gray-300" />}
                    </div>
                    <p>{viewMode === 'credits' ? 'אין לך זיכויים' : 'תיקייה ריקה'}</p>
                </div>
                )}
            </div>
            </section>
        )}

      </main>

      {/* --- Floating Action Button --- */}
      <div className="fixed bottom-24 left-6 z-20">
         <button 
           onClick={() => fileInputRef.current?.click()}
           className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all"
         >
           <Camera className="w-6 h-6" />
         </button>
         <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileUpload}
         />
      </div>

      {/* --- Bottom Navigation --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30 pb-safe">
        <button 
          onClick={() => { setActiveTab('folders'); setSelectedCategory(null); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'folders' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Folder className={`w-6 h-6 ${activeTab === 'folders' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">ראשי</span>
        </button>

        <div className="w-px h-8 bg-gray-100"></div>

        <button 
          onClick={simulateInboxScan}
          className={`flex flex-col items-center gap-1 ${activeTab === 'scan' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <MessageSquare className={`w-6 h-6 ${activeTab === 'scan' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">סריקת SMS</span>
        </button>
      </nav>

    </div>
  );
}
