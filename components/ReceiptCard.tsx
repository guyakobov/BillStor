import React, { useRef } from 'react';
import { Receipt } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, getCategoryStyles } from '../constants';
import { ExternalLink, Calendar, Loader2, Tag, Clock, Check } from 'lucide-react';

interface Props {
  receipt: Receipt;
  onClick: (r: Receipt) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

export const ReceiptCard: React.FC<Props> = ({ receipt, onClick, isSelectionMode = false, isSelected = false, onToggleSelection, onLongPress }) => {
  const isCredit = receipt.type === 'credit';
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  
  // Dynamic styling based on type and custom categories
  const { icon: CategoryIcon, colorClass: categoryColorClass } = getCategoryStyles(receipt.category);
  
  const Icon = isCredit ? Tag : CategoryIcon;
  const colorClass = isCredit ? 'bg-amber-100 text-amber-600' : categoryColorClass;
  const borderClass = isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50' : (isCredit ? 'border-amber-200' : 'border-gray-100');
  
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleTouchStart = () => {
    if (isSelectionMode) return;
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (onLongPress) onLongPress(receipt.id);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
        e.preventDefault();
        return;
    }

    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(receipt.id);
    } else {
      onClick(receipt);
    }
  };

  if (receipt.isProcessing) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`bg-white p-4 rounded-xl shadow-sm border ${borderClass} flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden select-none`}
    >
      {/* Visual Indicator strip for Credits */}
      {isCredit && !isSelected && <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-400"></div>}

      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
           {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
      )}

      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-900 truncate">{receipt.merchant}</h3>
          <span className={`font-bold whitespace-nowrap ${isCredit ? 'text-amber-600' : 'text-gray-900'}`}>
            {isCredit ? '+' : ''}{receipt.amount.toFixed(2)} {receipt.currency}
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-1 text-sm text-gray-500">
          <div className="flex items-center gap-3">
             {/* Show category for receipts, or "Credit Note" for credits */}
            {!isCredit ? (
               <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                 {receipt.category}
               </span>
            ) : (
               <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                 זיכוי
               </span>
            )}
            
            {/* Show Date or Expiration */}
            <div className="flex items-center gap-1 text-xs">
              {isCredit && receipt.expirationDate ? (
                 <>
                   <Clock className="w-3 h-3 text-red-400" />
                   <span className="text-red-500 font-medium">בתוקף עד {formatDate(receipt.expirationDate)}</span>
                 </>
              ) : (
                 <>
                   <Calendar className="w-3 h-3" />
                   <span>{formatDate(receipt.date)}</span>
                 </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};