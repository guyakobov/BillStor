import React, { useState, useEffect, useRef } from 'react';
import { Receipt, Category, SMSMessage } from './types';
import { KEYWORDS, MOCK_SMS_MESSAGES, getCategoryStyles, DEFAULT_CATEGORIES } from './constants';
import { analyzeReceiptFromText, analyzeReceiptFromImage } from './services/geminiService';
import { FolderGrid } from './components/FolderGrid';
import { ReceiptCard } from './components/ReceiptCard';
import { Search, Folder, MessageSquare, Plus, ArrowRight, Settings, Camera, ShieldCheck, X, Loader2, FileText, Tag, ChevronDown, Check, ArrowUpDown, Mail, Save, CheckSquare, TrendingUp, TrendingDown, Bell, AlertTriangle, Clock } from 'lucide-react';

const simpleId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  
  const [activeTab, setActiveTab] = useState<'folders' | 'scan'>('folders');
  const [viewMode, setViewMode] = useState<'expenses' | 'credits'>('expenses');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('date-desc');
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Notification / Alert State
  const [notificationThreshold, setNotificationThreshold] = useState(7); // Days
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]); // Alert IDs dismissed this session
  const notificationSentRef = useRef(false);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set());

  // New Folder Modal State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename Folder Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState<string | null>(null);
  const [renamedFolderName, setRenamedFolderName] = useState('');

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [defaultEmail, setDefaultEmail] = useState('');

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

    const savedEmail = localStorage.getItem('default_email');
    if (savedEmail) {
      setDefaultEmail(savedEmail);
    }

    const savedThreshold = localStorage.getItem('notification_threshold');
    if (savedThreshold) {
      setNotificationThreshold(Number(savedThreshold));
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('receipts_data', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('categories_data', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('default_email', defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    localStorage.setItem('notification_threshold', notificationThreshold.toString());
  }, [notificationThreshold]);

  // Monthly Stats Calculation
  const currentMonthDate = new Date();
  const currentMonthName = currentMonthDate.toLocaleDateString('he-IL', { month: 'long' });
  
  const monthlyStats = receipts.reduce((acc, r) => {
    const rDate = new Date(r.date);
    const isCurrentMonth = rDate.getMonth() === currentMonthDate.getMonth() && 
                          rDate.getFullYear() === currentMonthDate.getFullYear();
    
    if (isCurrentMonth) {
      if (r.type === 'credit') {
        acc.credits += r.amount;
      } else {
        acc.expenses += r.amount;
      }
    }
    return acc;
  }, { expenses: 0, credits: 0 });

  // Expiring Credits Calculation
  const expiringCredits = receipts.filter(r => {
    if (r.type !== 'credit' || !r.expirationDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(r.expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= notificationThreshold;
  });

  const showAlertBanner = expiringCredits.length > 0 && !dismissedAlerts.includes('expiring_credits');

  // Browser Notification Trigger
  useEffect(() => {
    if (expiringCredits.length === 0) {
      notificationSentRef.current = false;
      return;
    }

    if (expiringCredits.length > 0 && !notificationSentRef.current) {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('זיכויים עומדים לפוג', {
            body: `שים לב: ${expiringCredits.length} זיכויים יפוגו ב-${notificationThreshold} הימים הקרובים.`,
            icon: '/favicon.ico', // Fallback icon
          });
          notificationSentRef.current = true;
        } catch (e) {
          console.error('Notification failed:', e);
        }
      }
    }
  }, [expiringCredits.length, notificationThreshold]);

  const handlePermission = async () => {
    setPermissionGranted(true);
    setShowPermissionModal(false);
    
    // Request Notification Permission
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error('Notification permission error:', e);
      }
    }

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

  const initiateRename = (cat: string) => {
    setFolderToRename(cat);
    setRenamedFolderName(cat);
    setShowRenameModal(true);
  };

  const handleRenameCategory = () => {
    if (!folderToRename || !renamedFolderName.trim()) return;
    const oldName = folderToRename;
    const newName = renamedFolderName.trim();

    if (oldName === newName) {
      setShowRenameModal(false);
      return;
    }

    if (categories.includes(newName)) {
      alert('שם התיקייה כבר קיים');
      return;
    }

    // Update categories list
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    
    // Update receipts
    setReceipts(prev => prev.map(r => r.category === oldName ? { ...r, category: newName } : r));

    // If we are currently viewing this category, update the selection
    if (selectedCategory === oldName) {
        setSelectedCategory(newName);
    }

    setShowRenameModal(false);
    setFolderToRename(null);
    setRenamedFolderName('');
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

  const generateEmailContent = (items: Receipt[]) => {
    if (items.length === 0) return { subject: '', body: '' };

    const isSingle = items.length === 1;
    let subject = '';
    let body = '';

    if (isSingle) {
        const item = items[0];
        subject = `${item.type === 'credit' ? 'זיכוי' : 'קבלה'}: ${item.merchant} - ${new Date(item.date).toLocaleDateString('he-IL')}`;
        body = `
שלום,
להלן פרטי המסמך:

שם העסק: ${item.merchant}
תאריך: ${new Date(item.date).toLocaleDateString('he-IL')}
סכום: ${item.amount} ${item.currency}
קטגוריה: ${item.category}
סוג: ${item.type === 'credit' ? 'זיכוי' : 'קבלה'}
${item.expirationDate ? `בתוקף עד: ${new Date(item.expirationDate).toLocaleDateString('he-IL')}` : ''}

${item.url ? `קישור למסמך המקור: ${item.url}` : ''}
${item.originalSmsBody ? `\n\nתוכן הודעה מקורי:\n"${item.originalSmsBody}"` : ''}

נשלח באמצעות Receipt Organizer
        `.trim();
    } else {
        subject = `דוח הוצאות - ${items.length} פריטים - ${new Date().toLocaleDateString('he-IL')}`;
        const totalSum = items.reduce((sum, item) => sum + item.amount, 0);
        
        const itemsList = items.map((item, index) => {
            return `
${index + 1}. ${item.merchant} | ${new Date(item.date).toLocaleDateString('he-IL')} | ${item.amount} ${item.currency}
   סוג: ${item.type === 'credit' ? 'זיכוי' : 'קבלה'} | קטגוריה: ${item.category}
   ${item.url ? `קישור: ${item.url}` : '(אין קישור)'}
            `.trim();
        }).join('\n\n');

        body = `
שלום,
מצורף סיכום של ${items.length} מסמכים:

${itemsList}

---
סה"כ לתשלום/זיכוי: ${totalSum.toFixed(2)} ₪

נשלח באמצעות Receipt Organizer
        `.trim();
    }

    return { subject, body };
  };

  const handleEmailReceipts = (items: Receipt[]) => {
    const { subject, body } = generateEmailContent(items);
    window.open(`mailto:${defaultEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleEmailFolder = (category: string) => {
      const folderReceipts = receipts.filter(r => r.category === category);
      if (folderReceipts.length === 0) {
          alert('התיקייה ריקה');
          return;
      }
      handleEmailReceipts(folderReceipts);
  };

  const handleEmailSelected = () => {
    const selectedItems = receipts.filter(r => selectedReceiptIds.has(r.id));
    if (selectedItems.length === 0) return;
    handleEmailReceipts(selectedItems);
    
    // Exit selection mode after sending
    setIsSelectionMode(false);
    setSelectedReceiptIds(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedReceiptIds);
    if (newSelection.has(id)) {
        newSelection.delete(id);
    } else {
        newSelection.add(id);
    }
    setSelectedReceiptIds(newSelection);
  };

  const toggleSelectionMode = () => {
      if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedReceiptIds(new Set());
      } else {
          setIsSelectionMode(true);
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

  // Get recent receipts for Home Screen
  const recentReceipts = receipts
    .filter(r => r.type !== 'credit') // Usually show expenses in the quick view
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const displayReceipts = receipts.filter(r => {
    const isCorrectType = viewMode === 'expenses' ? r.type !== 'credit' : r.type === 'credit';
    const matchesSearch = r.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.amount.toString().includes(searchQuery);
    const matchesCategory = selectedCategory ? r.category === selectedCategory : true;
    
    if (viewMode === 'credits') {
        return isCorrectType && matchesSearch;
    }
    return isCorrectType && matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortOption) {
      case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc': return a.amount - b.amount;
      case 'date-desc':
      default: return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
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

      {/* --- Rename Folder Modal --- */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 className="text-xl font-bold text-gray-900 mb-4">שינוי שם תיקייה</h3>
             <input 
               type="text" 
               autoFocus
               placeholder="שם חדש..."
               className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
               value={renamedFolderName}
               onChange={(e) => setRenamedFolderName(e.target.value)}
             />
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowRenameModal(false)}
                 className="flex-1 py-3 text-gray-500 font-medium active:bg-gray-50 rounded-xl"
               >
                 ביטול
               </button>
               <button 
                 onClick={handleRenameCategory}
                 disabled={!renamedFolderName.trim() || renamedFolderName === folderToRename}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
               >
                 שמור שינויים
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- Settings Modal --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">הגדרות</h3>
                <button onClick={() => setShowSettingsModal(false)} className="p-1 bg-gray-100 rounded-full">
                   <X className="w-5 h-5 text-gray-500" />
                </button>
             </div>
             
             {/* Notification Settings */}
             <div className="mb-6 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-gray-800">התראות פג תוקף</h4>
                </div>
                <label className="block text-sm text-gray-600 mb-2">
                    התראה על זיכויים שעומדים לפוג:
                </label>
                <select 
                    value={notificationThreshold}
                    onChange={(e) => setNotificationThreshold(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none"
                >
                    <option value="3">3 ימים לפני</option>
                    <option value="7">שבוע לפני (ברירת מחדל)</option>
                    <option value="14">שבועיים לפני</option>
                    <option value="30">חודש לפני</option>
                </select>
             </div>

             <div className="mb-6">
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 כתובת מייל לשליחת מסמכים
               </label>
               <div className="relative">
                 <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                    type="email" 
                    placeholder="example@email.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    value={defaultEmail}
                    onChange={(e) => setDefaultEmail(e.target.value)}
                 />
               </div>
               <p className="text-xs text-gray-400 mt-2">
                 כתובת זו תשמש כברירת מחדל בעת לחיצה על "שלח למייל" בפרטי הקבלה או בשליחת מרוכזת.
               </p>
             </div>

             <button 
               onClick={() => setShowSettingsModal(false)}
               className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               <Save className="w-4 h-4" />
               שמור וסגור
             </button>
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

                <div className="flex flex-col gap-3">
                    {selectedReceipt.url && (
                    <a 
                        href={selectedReceipt.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3 rounded-xl font-medium shadow-lg shadow-gray-200"
                    >
                        <span>פתח מסמך מקור</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                    </a>
                    )}

                    <button
                        onClick={() => handleEmailReceipts([selectedReceipt])}
                        className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-medium border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                        <Mail className="w-4 h-4" />
                        <span>שלח למייל {defaultEmail ? `(${defaultEmail})` : ''}</span>
                    </button>
                </div>

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
          {isSelectionMode ? (
             <div className="flex items-center gap-3 w-full">
               <button onClick={toggleSelectionMode} className="p-1">
                 <X className="w-6 h-6 text-gray-600" />
               </button>
               <span className="font-bold text-lg">{selectedReceiptIds.size} נבחרו</span>
             </div>
          ) : selectedCategory ? (
             <button onClick={() => setSelectedCategory(null)} className="flex items-center text-gray-600 gap-1">
               <ArrowRight className="w-5 h-5" />
               <span className="font-bold">חזרה לתיקיות</span>
             </button>
          ) : (
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">הארנק שלי</h1>
          )}
          
          {!isSelectionMode && (
             <div className="flex gap-2">
                 {/* Only show select button in list views (category selected or recent list) */}
                {(selectedCategory || (activeTab === 'folders' && !selectedCategory && recentReceipts.length > 0)) && (
                     <button 
                        onClick={toggleSelectionMode}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                     >
                        <CheckSquare className="w-5 h-5 text-gray-600" />
                     </button>
                )}
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                >
                    <Settings className="w-5 h-5 text-gray-600" />
                </button>
             </div>
          )}
        </div>

        {/* View Toggle (Receipts vs Credits) - Hide in Selection Mode */}
        {!selectedCategory && !isSelectionMode && (
            <div className="flex p-1 bg-gray-100 rounded-xl mb-3 relative">
                <button 
                    onClick={() => setViewMode('expenses')}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'expenses' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                    הוצאות
                </button>
                <button 
                    onClick={() => setViewMode('credits')}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all relative ${viewMode === 'credits' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500'}`}
                >
                    זיכויים
                    {/* Badge on Toggle */}
                    {expiringCredits.length > 0 && (
                        <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full border border-white"></span>
                    )}
                </button>
            </div>
        )}

        {/* Search Bar - Hide in Selection Mode */}
        {!isSelectionMode && (
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
        )}
      </header>

      {/* --- Content Area --- */}
      <main className={`p-4 space-y-6 ${isSelectionMode ? 'pb-24' : ''}`}>
        
        {isScanning && (
          <div className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-blue-200 animate-pulse">
             <Loader2 className="w-5 h-5 animate-spin" />
             <span className="text-sm font-medium">{scanningStatus}</span>
          </div>
        )}

        {/* ALERT BANNER */}
        {showAlertBanner && !isSelectionMode && !selectedCategory && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm relative overflow-hidden">
                <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0 z-10">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 z-10">
                    <h3 className="text-red-800 font-bold text-sm mb-1">שים לב: זיכויים עומדים לפוג</h3>
                    <p className="text-red-600 text-xs leading-relaxed">
                        יש לך {expiringCredits.length} זיכויים שתוקפם יפוג ב-{notificationThreshold} הימים הקרובים.
                    </p>
                    <button 
                        onClick={() => setViewMode('credits')}
                        className="text-red-700 text-xs font-bold mt-2 underline"
                    >
                        צפה בזיכויים
                    </button>
                </div>
                <button 
                    onClick={() => setDismissedAlerts(prev => [...prev, 'expiring_credits'])}
                    className="p-1 text-red-300 hover:text-red-500 z-10"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* MONTHLY SUMMARY - Visible on Dashboard Main Screen (Both Expenses & Credits) */}
        {!selectedCategory && activeTab === 'folders' && !isSelectionMode && (
             <div className="grid grid-cols-2 gap-3 mb-2">
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-8 -mt-8"></div>
                     <span className="text-xs font-bold text-gray-400 block mb-1 relative z-10">הוצאות {currentMonthName}</span>
                     <div className="flex items-center gap-2 mt-2">
                         <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <TrendingDown className="w-4 h-4" />
                         </div>
                         <span className="text-2xl font-black text-gray-900">₪{monthlyStats.expenses.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                     </div>
                 </div>
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-8 -mt-8"></div>
                     <span className="text-xs font-bold text-amber-500/80 block mb-1 relative z-10">זיכויים {currentMonthName}</span>
                     <div className="flex items-center gap-2 mt-2">
                          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                            <TrendingUp className="w-4 h-4" />
                         </div>
                          <span className="text-2xl font-black text-amber-600">₪{monthlyStats.credits.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                     </div>
                 </div>
             </div>
        )}

        {/* FOLDERS VIEW (Expenses) */}
        {!selectedCategory && viewMode === 'expenses' && activeTab === 'folders' && (
          <section className="space-y-6">
            
            {/* Recent Receipts Section */}
            {recentReceipts.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 px-1">נוספו לאחרונה</h2>
                <div className="space-y-3">
                    {recentReceipts.map(r => (
                        <ReceiptCard 
                            key={r.id} 
                            receipt={r} 
                            onClick={setSelectedReceipt} 
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedReceiptIds.has(r.id)}
                            onToggleSelection={toggleSelection}
                        />
                    ))}
                </div>
              </div>
            )}

            {/* Folders Section - Hide folders when in global selection mode if we want to focus on recent items, or just disable folder interaction */}
            {!isSelectionMode && (
                <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 px-1">תיקיות</h2>
                <FolderGrid 
                    receipts={receipts.filter(r => r.type !== 'credit')} 
                    categories={categories}
                    onSelectCategory={setSelectedCategory} 
                    onAddFolder={() => setShowNewFolderModal(true)}
                    onRenameFolder={initiateRename}
                    onEmailFolder={handleEmailFolder}
                />
                </div>
            )}
          </section>
        )}

        {/* LIST VIEW (Credits or specific Category) */}
        {(selectedCategory || viewMode === 'credits') && (
            <section>
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-lg font-bold text-gray-800">
                {viewMode === 'credits' ? 'זיכויים זמינים' : selectedCategory}
                </h2>
                
                {/* Sort Dropdown - Hide in Selection */}
                {!isSelectionMode && (
                    <div className="relative">
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 text-gray-600 text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                        <option value="date-desc">תאריך (חדש)</option>
                        <option value="date-asc">תאריך (ישן)</option>
                        <option value="amount-desc">סכום (גבוה)</option>
                        <option value="amount-asc">סכום (נמוך)</option>
                    </select>
                    <ArrowUpDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {displayReceipts.length > 0 ? (
                    displayReceipts.map(r => (
                    <ReceiptCard 
                        key={r.id} 
                        receipt={r} 
                        onClick={setSelectedReceipt}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedReceiptIds.has(r.id)}
                        onToggleSelection={toggleSelection}
                    />
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

      {/* --- Floating Action Button (Camera) - Hide in Selection Mode --- */}
      {!isSelectionMode && (
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
      )}

      {/* --- Selection Mode Action Bar --- */}
      {isSelectionMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <span className="text-sm font-medium text-gray-500">
                  {selectedReceiptIds.size} פריטים נבחרו
              </span>
              <button 
                onClick={handleEmailSelected}
                disabled={selectedReceiptIds.size === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
              >
                  <Mail className="w-5 h-5" />
                  שלח במייל
              </button>
          </div>
      )}

      {/* --- Bottom Navigation - Hide in Selection Mode --- */}
      {!isSelectionMode && (
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
      )}

    </div>
  );
}