import React from 'react';
import { Store } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { STORES } from '../constants/stores';

const StoreSwitcher: React.FC = () => {
  const { storeId, setStoreId } = useStore();

  return (
    <div className="inline-flex items-center gap-1.5 p-1 bg-white/80 backdrop-blur rounded-2xl border border-gray-200 shadow-sm">
      <div className="pl-2 pr-1 text-gray-400">
        <Store className="w-4 h-4" />
      </div>
      {STORES.map((s) => {
        const active = s.id === storeId;
        return (
          <button
            key={s.id}
            onClick={() => setStoreId(s.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s.shortName}
          </button>
        );
      })}
    </div>
  );
};

export default StoreSwitcher;