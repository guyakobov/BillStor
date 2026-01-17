import React, { useRef } from 'react';
import { Category, Receipt } from '../types';
import { getCategoryStyles, DEFAULT_CATEGORIES } from '../constants';
import { Plus, Pencil, Mail, Check } from 'lucide-react';

interface Props {
  receipts: Receipt[];
  categories: string[];
  onSelectCategory: (category: string) => void;
  onAddFolder: () => void;
  onRenameFolder: (category: string) => void;
  onEmailFolder: (category: string) => void;
  isSelectionMode?: boolean;
  selectedCategories?: Set<string>;
  onToggleCategory?: (category: string) => void;
  onLongPress?: (category: string) => void;
}

export const FolderGrid: React.FC<Props> = ({ 
  receipts, 
  categories, 
  onSelectCategory, 
  onAddFolder, 
  onRenameFolder, 
  onEmailFolder,
  isSelectionMode = false,
  selectedCategories = new Set(),
  onToggleCategory,
  onLongPress
}) => {
  const getCount = (cat: string) => receipts.filter(r => r.category === cat).length;
  const getTotal = (cat: string) => receipts
    .filter(r => r.category === cat)
    .reduce((sum, r) => sum + r.amount, 0);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const handleTouchStart = (cat: string) => {
    if (isSelectionMode) return;
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (onLongPress) onLongPress(cat);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
  };

  const handleFolderClick = (e: React.MouseEvent, cat: string) => {
      if (isLongPressRef.current) {
          e.preventDefault();
          return;
      }
      
      if (isSelectionMode && onToggleCategory) {
        onToggleCategory(cat);
      } else {
        onSelectCategory(cat);
      }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.map((cat) => {
        const { icon: Icon, colorClass } = getCategoryStyles(cat);
        const count = getCount(cat);
        const total = getTotal(cat);
        const isDefault = DEFAULT_CATEGORIES.includes(cat as Category);
        const isSelected = selectedCategories.has(cat);

        // Hide empty default folders if they are not the main ones, but always show custom folders
        if (isDefault && count === 0 && cat !== Category.Shopping && cat !== Category.Food) return null;

        return (
          <div 
            key={cat}
            onClick={(e) => handleFolderClick(e, cat)}
            onTouchStart={() => handleTouchStart(cat)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            onMouseDown={() => handleTouchStart(cat)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            className={`group relative bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-3 active:bg-gray-50 transition-all cursor-pointer h-32 justify-between select-none
              ${isSelected && isSelectionMode ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50/50' : 'border-gray-100'}
            `}
          >
             {/* Selection Checkbox Overlay */}
             {isSelectionMode && (
               <div className={`absolute top-3 left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-20 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
               </div>
            )}

            <div className="flex justify-between items-start">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                 <Icon className="w-5 h-5" />
               </div>
               
               {/* Hide actions in selection mode */}
               {!isSelectionMode && (
                 <div className="flex gap-1">
                   <button 
                      onClick={(e) => { e.stopPropagation(); onEmailFolder(cat); }}
                      className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors z-10"
                      title="שלח דוח למייל"
                    >
                      <Mail className="w-3.5 h-3.5" />
                   </button>
                   <button 
                      onClick={(e) => { e.stopPropagation(); onRenameFolder(cat); }}
                      className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors z-10"
                      title="שנה שם"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                   </button>
                 </div>
               )}
            </div>
            
            <div>
              <h3 className="font-bold text-gray-800 text-sm truncate pr-1">{cat}</h3>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                {count} פריטים • ₪{total.toFixed(0)}
              </p>
            </div>
          </div>
        );
      })}

      {/* Add Folder Button - Hide in selection mode */}
      {!isSelectionMode && (
        <div 
          onClick={onAddFolder}
          className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 active:bg-gray-100 transition-colors cursor-pointer h-32 text-gray-400 hover:text-gray-600 hover:border-gray-300"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">תיקייה חדשה</span>
        </div>
      )}
    </div>
  );
};