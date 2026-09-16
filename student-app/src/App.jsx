import React, { useState, useEffect } from 'react';
import { Utensils, QrCode, Clock, CheckCircle2, AlertCircle, Copy, Check, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('pickup');
  const [orderStatus, setOrderStatus] = useState('READY'); // CONFIRMED | PREPARING | READY | COLLECTED
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(14 * 60 + 45); // 14m 45s pickup countdown

  // Sample order data
  const order = {
    orderNumber: 'RH-2026-001',
    canteenName: 'Main Campus Food Court',
    canteenLocation: 'Ground Floor, SAC',
    items: [
      { name: 'Wok Tossed Veg Hakka Noodles', qty: 1, price: 70.00 },
      { name: 'Crispy Punjabi Samosa (2 pcs)', qty: 1, price: 30.00 },
    ],
    totalAmount: 100.00,
    otpCode: '7492',
    pickupTokenHash: 'rh_token_live_sha256_hash_7492_rh2026001',
  };

  // Timer countdown when order is READY
  useEffect(() => {
    if (orderStatus !== 'READY') return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [orderStatus]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  const handleCopyOtp = () => {
    navigator.clipboard?.writeText(order.otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between shadow-2xl border-x border-gray-200">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xl font-black tracking-tight text-orange-600">Rush Hours</span>
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">Campus</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Pre-order • Skip Counter Rush</p>
        </div>
        <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full text-xs font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Orders</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto space-y-4">
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-orange-100 mb-1">
                <span>Active Canteen</span>
                <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> Avg 8 mins prep</span>
              </div>
              <h2 className="text-lg font-bold">{order.canteenName}</h2>
              <p className="text-xs text-orange-100 mt-0.5">{order.canteenLocation}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 text-center space-y-3">
              <p className="text-sm text-gray-600 font-medium">You have an active ongoing order!</p>
              <button
                onClick={() => setActiveTab('pickup')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow"
              >
                Go to Order Status & Pickup QR →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pickup' && (
          <div className="space-y-4">
            {/* Status Flow Tracker */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Order Number</span>
                  <div className="font-mono font-black text-gray-900 text-base">{order.orderNumber}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Canteen</span>
                  <div className="text-xs font-semibold text-gray-800">{order.canteenName}</div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 text-center text-[10px] font-bold uppercase">
                <div className={`py-1.5 rounded-lg border ${
                  orderStatus === 'CONFIRMED' ? 'bg-orange-500 text-white border-orange-600' : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  Confirmed
                </div>
                <div className={`py-1.5 rounded-lg border ${
                  orderStatus === 'PREPARING' ? 'bg-orange-500 text-white border-orange-600' :
                  ['READY', 'COLLECTED'].includes(orderStatus) ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}>
                  Preparing
                </div>
                <div className={`py-1.5 rounded-lg border ${
                  orderStatus === 'READY' ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse' :
                  orderStatus === 'COLLECTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}>
                  Ready
                </div>
                <div className={`py-1.5 rounded-lg border ${
                  orderStatus === 'COLLECTED' ? 'bg-gray-800 text-white border-gray-900' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}>
                  Collected
                </div>
              </div>
            </div>

            {/* Main Pickup Pass Card */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-md text-center space-y-4 relative overflow-hidden">
              {/* Collected Watermark Badge */}
              {orderStatus === 'COLLECTED' && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Meal Collected!</h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    This single-use QR and OTP have been redeemed. Enjoy your meal!
                  </p>
                </div>
              )}

              {/* Ready Expiration Banner */}
              {orderStatus === 'READY' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between text-xs text-amber-800">
                  <span className="flex items-center font-medium">
                    <Clock className="w-4 h-4 mr-1 text-amber-600" />
                    Pickup Window Expiry:
                  </span>
                  <span className="font-mono font-bold text-sm bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-lg">
                    {formatTime(secondsLeft)}
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-gray-800">Show at Canteen Counter</h3>
                <p className="text-xs text-gray-500 mt-0.5">Staff will scan your QR code or enter your 4-digit OTP</p>
              </div>

              {/* Dynamic QR Code Box */}
              <div className="w-52 h-52 mx-auto bg-white border-2 border-gray-800 rounded-2xl flex flex-col items-center justify-center p-3 shadow-inner">
                {/* SVG Visual QR representation of token */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-gray-900">
                  <rect x="0" y="0" width="30" height="30" fill="currentColor" rx="4" />
                  <rect x="5" y="5" width="20" height="20" fill="white" rx="2" />
                  <rect x="10" y="10" width="10" height="10" fill="currentColor" rx="1" />

                  <rect x="70" y="0" width="30" height="30" fill="currentColor" rx="4" />
                  <rect x="75" y="5" width="20" height="20" fill="white" rx="2" />
                  <rect x="80" y="10" width="10" height="10" fill="currentColor" rx="1" />

                  <rect x="0" y="70" width="30" height="30" fill="currentColor" rx="4" />
                  <rect x="5" y="75" width="20" height="20" fill="white" rx="2" />
                  <rect x="10" y="80" width="10" height="10" fill="currentColor" rx="1" />

                  {/* Pixel Pattern Grid */}
                  <rect x="35" y="5" width="6" height="6" fill="currentColor" />
                  <rect x="45" y="12" width="6" height="6" fill="currentColor" />
                  <rect x="55" y="5" width="6" height="6" fill="currentColor" />
                  <rect x="38" y="25" width="6" height="6" fill="currentColor" />
                  <rect x="50" y="22" width="6" height="6" fill="currentColor" />
                  <rect x="15" y="45" width="6" height="6" fill="currentColor" />
                  <rect x="25" y="52" width="6" height="6" fill="currentColor" />
                  <rect x="42" y="42" width="16" height="16" fill="currentColor" rx="2" />
                  <rect x="70" y="45" width="6" height="6" fill="currentColor" />
                  <rect x="85" y="52" width="6" height="6" fill="currentColor" />
                  <rect x="38" y="75" width="6" height="6" fill="currentColor" />
                  <rect x="52" y="82" width="6" height="6" fill="currentColor" />
                  <rect x="75" y="78" width="6" height="6" fill="currentColor" />
                  <rect x="88" y="88" width="6" height="6" fill="currentColor" />
                </svg>
              </div>

              {/* 4-Digit OTP Fallback Card */}
              <div className="bg-gradient-to-b from-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="text-left">
                  <div className="text-[11px] font-semibold text-orange-800 uppercase tracking-wide">
                    4-Digit Pickup OTP
                  </div>
                  <div className="font-mono font-black text-3xl tracking-widest text-orange-600 mt-0.5">
                    {order.otpCode}
                  </div>
                </div>
                <button
                  onClick={handleCopyOtp}
                  className="bg-white border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1 hover:bg-orange-100/50 transition shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Ordered Items Summary */}
              <div className="text-left border-t border-gray-100 pt-3 space-y-1 text-xs text-gray-600">
                <div className="font-bold text-gray-800 mb-1">Items in this order:</div>
                {order.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{i.qty}x {i.name}</span>
                    <span className="font-semibold text-gray-700">₹{i.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-dashed border-gray-200">
                  <span>Total Paid (Razorpay)</span>
                  <span className="text-orange-600">₹{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Simulation Controls for Reviewers */}
            <div className="bg-gray-100/80 rounded-2xl p-3 text-xs space-y-2 border border-gray-200">
              <div className="font-bold text-gray-700 flex items-center">
                <span>Simulate Order Status:</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {['CONFIRMED', 'PREPARING', 'READY', 'COLLECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatus(st)}
                    className={`py-1 rounded text-[10px] font-bold uppercase transition ${
                      orderStatus === st ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
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
            activeTab === 'menu' ? 'text-orange-600 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Utensils className="w-5 h-5 mb-0.5" />
          Menu
        </button>
        <button
          onClick={() => setActiveTab('pickup')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${
            activeTab === 'pickup' ? 'text-orange-600 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          Active Pickup
        </button>
      </nav>
    </div>
  );
}
