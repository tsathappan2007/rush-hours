import React, { useState } from 'react';
import { Utensils, QrCode, ShoppingBag, Clock, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('menu');

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-lg flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xl font-black tracking-tight text-orange-600">Rush Hours</span>
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Campus</span>
          </div>
          <p className="text-xs text-gray-500">Fast canteen pre-orders & pickup</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            3 Canteens Open
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto space-y-4">
        {activeTab === 'menu' && (
          <div className="space-y-4">
            {/* Canteen Selector Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-orange-100 mb-1">
                <span>Select Canteen</span>
                <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> Avg 8 mins prep</span>
              </div>
              <h2 className="text-lg font-bold">Main Campus Food Court</h2>
              <p className="text-xs text-orange-100 mt-0.5">Skip the queue • Pre-order & Pick up</p>
            </div>

            {/* Menu Scaffold Placeholder */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-500 space-y-3">
              <Utensils className="w-10 h-10 mx-auto text-orange-400 stroke-[1.5]" />
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Live Menu & Ordering (Scaffold)</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Connects to <code className="bg-gray-100 px-1 py-0.5 rounded">server/src/routes/canteen.routes.js</code>
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('pickup')}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition shadow-sm"
                >
                  View Sample Pickup QR / OTP
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pickup' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-sm space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 text-orange-600 mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Ready for Pickup
                </span>
                <h3 className="text-base font-bold text-gray-800 mt-2">Order #RH-204</h3>
                <p className="text-xs text-gray-500">Show this QR or share your OTP at the counter</p>
              </div>

              {/* QR Code Placeholder Box */}
              <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-4">
                <QrCode className="w-20 h-20 text-gray-400" />
                <span className="text-xs text-gray-400 mt-2 font-mono">Dynamic QR Code</span>
              </div>

              {/* OTP Pill */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="text-xs text-gray-500">Pickup OTP</div>
                <div className="text-2xl font-mono font-black tracking-widest text-orange-600 mt-0.5">
                  7 4 9 2
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="border-t border-gray-200 bg-white px-6 py-2 flex justify-around items-center">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${
            activeTab === 'menu' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Utensils className="w-5 h-5 mb-0.5" />
          Menu
        </button>
        <button
          onClick={() => setActiveTab('pickup')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${
            activeTab === 'pickup' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          Pickup QR
        </button>
      </nav>
    </div>
  );
}
