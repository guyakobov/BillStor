import React from 'react';
import { Category, Receipt } from '../types';
import { getCategoryStyles, DEFAULT_CATEGORIES } from '../constants';
import { Plus } from 'lucide-react';

interface Props {
  receipts: Receipt[];
  categories: string[];
  onSelectCategory: (category: string) => void;
  onAddFolder: () => void;
}

export const FolderGrid: React.FC<Props> = ({ receipts, categories, onSelectCategory, onAddFolder }) => {
  const getCount = (cat: string) => receipts.filter(r => r.category === cat).length;
  const getTotal = (cat: string) => receipts
    .filter(r => r.category === cat)
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {categories.map((cat) => {
        const { icon: Icon, colorClass } = getCategoryStyles(cat);
        const count = getCount(cat);
        const total = getTotal(cat);
        const isDefault = DEFAULT_CATEGORIES.includes(cat as Category);

        // Hide empty default folders if they are not the main ones, but always show custom folders
        if (isDefault && count === 0 && cat !== Category.Shopping && cat !== Category.Food) return null;

        return (
          <div 
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 active:bg-gray-50 transition-colors cursor-pointer h-32 justify-between"
          >
            <div className="flex justify-between items-start">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                 <Icon className="w-5 h-5" />
               </div>
               <span className="text-xs font-medium text-gray-400">{count} פריטים</span>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-800 text-sm truncate">{cat}</h3>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                ₪{total.toFixed(0)}
              </p>
            </div>
          </div>
        );
      })}

      {/* Add Folder Button */}
      <div 
        onClick={onAddFolder}
        className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 active:bg-gray-100 transition-colors cursor-pointer h-32 text-gray-400 hover:text-gray-600 hover:border-gray-300"
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">תיקייה חדשה</span>
      </div>
    </div>
  );
};
