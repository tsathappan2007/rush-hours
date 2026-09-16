import React, { useState } from 'react';
import { ChefHat, ClipboardList, ScanLine, Boxes, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [otpInput, setOtpInput] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-600 rounded-xl text-white">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Rush Hours Staff Portal</h1>
            <p className="text-xs text-gray-500">Canteen Manager • Counter #1</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Receiving Orders
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'orders'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Live Orders</span>
              <span className="ml-auto bg-emerald-200 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                4
              </span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'verify'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ScanLine className="w-5 h-5" />
              <span>Verify Pickup</span>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'stock'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Boxes className="w-5 h-5" />
              <span>Stock Control</span>
            </button>
          </nav>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">API Gateway</p>
            <p className="font-mono text-[11px] text-gray-500 truncate">localhost:5000/api</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Incoming & Active Orders</h2>
                  <p className="text-xs text-gray-500">Live order queue synced with student-app</p>
                </div>
              </div>

              {/* Sample Order Cards Placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-gray-800">Order #RH-204</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      Ready for Pickup
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>1x Veg Hakka Noodles</div>
                    <div>1x Fresh Lime Soda</div>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t border-emerald-100 flex justify-between">
                    <span>Student: Hariharan</span>
                    <span className="font-mono font-semibold text-gray-700">OTP: 7492</span>
                  </div>
                </div>

                <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-gray-800">Order #RH-205</span>
                    <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                      Preparing
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>2x Paneer Butter Masala Roll</div>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t border-amber-100 flex justify-between">
                    <span>Student: Sathappan</span>
                    <span className="font-mono font-semibold text-gray-700">OTP: 1983</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="max-w-md mx-auto py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <ScanLine className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verify Student QR / OTP</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Scan camera QR or enter 4-digit pickup OTP to hand over meal
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter 4-digit OTP"
                  className="flex-1 text-center font-mono text-lg font-bold border border-gray-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 rounded-xl transition shadow-sm">
                  Verify
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Stock & Availability (Scaffold)</h2>
                <p className="text-xs text-gray-500">Toggle menu items out-of-stock in real-time</p>
              </div>

              <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-500 space-y-2">
                <Boxes className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-xs text-gray-400">
                  Stock management API endpoints located in <code className="bg-gray-100 px-1 py-0.5 rounded">server/src/routes/canteen.routes.js</code>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
