import React, { useState, useEffect } from 'react';
import {
  Utensils,
  QrCode,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ShoppingBag,
  Plus,
  Minus,
  SlidersHorizontal,
  XCircle,
  RotateCcw
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('menu');
  const [orderStatus, setOrderStatus] = useState('CONFIRMED'); // CONFIRMED | PREPARING | READY | COLLECTED | FORFEITED | REFUNDED
  const [copied, setCopied] = useState(false);
  const [canteenPaused, setCanteenPaused] = useState(false);

  // 2-minute grace window timer (120 seconds)
  const [graceSeconds, setGraceSeconds] = useState(115);

  // 20-minute pickup deadline countdown (1200 seconds)
  const [readySeconds, setReadySeconds] = useState(20 * 60);

  // Time-slots with capacity limits
  const timeSlots = [
    { id: 'slot-1', time: '12:30 - 12:45 PM', max: 25, booked: 18, remaining: 7 },
    { id: 'slot-2', time: '12:45 - 01:00 PM', max: 25, booked: 25, remaining: 0 }, // FULL
    { id: 'slot-3', time: '01:00 - 01:15 PM', max: 20, booked: 12, remaining: 8 },
    { id: 'slot-4', time: '01:15 - 01:30 PM', max: 20, booked: 4, remaining: 16 },
  ];

  const [selectedSlotId, setSelectedSlotId] = useState('slot-1');

  // Menu items with available customization tags
  const menuItems = [
    {
      id: 'item-1',
      name: 'Wok Tossed Veg Hakka Noodles',
      price: 70.00,
      category: 'Meals',
      stock: 'Slot Capacity',
      availableCustomizations: ['No Onion', 'Extra Spicy', 'Less Oil'],
    },
    {
      id: 'item-2',
      name: 'Crispy Punjabi Samosa (2 pcs)',
      price: 30.00,
      category: 'Snacks',
      stock: '24 left',
      availableCustomizations: ['Extra Chutney', 'No Onion'],
    },
    {
      id: 'item-3',
      name: 'Fresh Mint Lime Soda',
      price: 35.00,
      category: 'Beverages',
      stock: '18 left',
      availableCustomizations: ['Less Sugar', 'Extra Mint', 'No Ice'],
    },
  ];

  const [cart, setCart] = useState({
    'item-1': 1,
    'item-2': 1,
  });

  // Selected item customizations: { 'item-1': ['No Onion', 'Extra Spicy'] }
  const [customizations, setCustomizations] = useState({
    'item-1': ['No Onion', 'Extra Spicy'],
    'item-2': ['Extra Chutney'],
  });

  // 2-minute grace countdown when CONFIRMED
  useEffect(() => {
    if (orderStatus !== 'CONFIRMED') return;
    const interval = setInterval(() => {
      setGraceSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [orderStatus]);

  // 20-minute pickup countdown when READY
  useEffect(() => {
    if (orderStatus !== 'READY') return;
    const interval = setInterval(() => {
      setReadySeconds((prev) => {
        if (prev <= 1) {
          setOrderStatus('FORFEITED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [orderStatus]);

  const toggleCustomization = (itemId, tag) => {
    setCustomizations((prev) => {
      const current = prev[itemId] || [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, [itemId]: updated };
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const totalAmount = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const selectedSlot = timeSlots.find((s) => s.id === selectedSlotId);

  // Active order object
  const activeOrder = {
    orderNumber: 'RH-2026-001',
    canteenName: 'Main Campus Food Court',
    canteenLocation: 'Ground Floor, SAC',
    timeSlot: selectedSlot?.time || '12:30 - 12:45 PM',
    items: Object.entries(cart).map(([id, qty]) => {
      const m = menuItems.find((item) => item.id === id);
      return {
        id,
        name: m?.name || 'Item',
        qty,
        price: (m?.price || 0) * qty,
        chosenCustomizations: customizations[id] || [],
      };
    }),
    totalAmount,
    otpCode: '7492',
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  const handleCopyOtp = () => {
    navigator.clipboard?.writeText(activeOrder.otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckout = () => {
    if (canteenPaused || selectedSlot?.remaining === 0) return;
    setActiveTab('pickup');
    setOrderStatus('CONFIRMED');
    setGraceSeconds(120);
  };

  const handleCancelOrder = () => {
    if (graceSeconds <= 0) return;
    setOrderStatus('REFUNDED');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between shadow-2xl border-x border-gray-200 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xl font-black tracking-tight text-orange-600">Rush Hours</span>
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">Campus</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Pre-order • Skip Counter Rush</p>
        </div>

        {canteenPaused ? (
          <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-bold text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Orders Paused</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Open & Taking Orders</span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto space-y-4">
        {activeTab === 'menu' && (
          <div className="space-y-4">
            {/* Canteen Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-orange-100 mb-1">
                <span>Selected Canteen</span>
                <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> Avg 8 mins prep</span>
              </div>
              <h2 className="text-lg font-bold">Main Campus Food Court</h2>
              <p className="text-xs text-orange-100 mt-0.5">Ground Floor, Student Activity Center (SAC)</p>
            </div>

            {/* PAUSED WARNING BANNER */}
            {canteenPaused && (
              <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 text-rose-900 flex items-start space-x-3 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">Canteen is Currently Busy</h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Staff have temporarily paused new incoming orders to catch up with kitchen preparation. Please check back shortly!
                  </p>
                </div>
              </div>
            )}

            {/* Menu List with Customization Checkboxes */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-black text-sm text-gray-900">Live Menu & Item Customizations</h3>
              <div className="space-y-4 divide-y divide-gray-100">
                {menuItems.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">{item.name}</h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                          <span className="font-bold text-orange-600">₹{item.price.toFixed(2)}</span>
                          <span>•</span>
                          <span className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                            {item.stock}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {cart[item.id] ? (
                          <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-xl p-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white text-orange-700 flex items-center justify-center font-bold shadow-xs hover:bg-orange-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-xs text-orange-900 w-4 text-center">
                              {cart[item.id]}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs hover:bg-orange-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={canteenPaused}
                            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CUSTOMIZATION CHECKBOXES (shown if in cart) */}
                    {cart[item.id] && item.availableCustomizations && (
                      <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-2.5 text-xs space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider flex items-center">
                          <SlidersHorizontal className="w-3 h-3 mr-1" /> Customization Preferences:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.availableCustomizations.map((tag) => {
                            const isChecked = (customizations[item.id] || []).includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleCustomization(item.id, tag)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
                                  isChecked
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <span>{isChecked ? '✓' : '+'}</span>
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Time-Slot Picker */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
              <div>
                <h3 className="font-black text-sm text-gray-900">Select Pickup Time-Slot</h3>
                <p className="text-xs text-gray-500">Pick an available batch window to collect your order</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {timeSlots.map((slot) => {
                  const isFull = slot.remaining === 0;
                  const isSelected = selectedSlotId === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isFull || canteenPaused}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`p-3 rounded-xl text-left border-2 transition relative ${
                        isFull
                          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-orange-50/80 border-orange-500 ring-2 ring-orange-200'
                          : 'bg-white border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="font-bold text-xs text-gray-900">{slot.time}</div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        {isFull ? (
                          <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                            FULL (0 left)
                          </span>
                        ) : (
                          <span className={`font-semibold ${
                            slot.remaining <= 8 ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {slot.remaining} slots remaining
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkout Bar */}
            {Object.keys(cart).length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-md space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">Total Payable</span>
                    <span className="text-xl font-black text-gray-900">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-gray-500 block">Pickup Slot:</span>
                    <span className="font-bold text-orange-600">{selectedSlot?.time}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={canteenPaused || selectedSlot?.remaining === 0}
                  className={`w-full py-3 px-4 rounded-xl font-black text-sm transition shadow flex items-center justify-center space-x-2 ${
                    canteenPaused || selectedSlot?.remaining === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {canteenPaused
                      ? 'Orders Temporarily Paused'
                      : selectedSlot?.remaining === 0
                      ? 'Select an Available Slot'
                      : 'Pay via Razorpay & Confirm'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pickup' && (
          <div className="space-y-4">
            {/* Status Header */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Order Number</span>
                  <div className="font-mono font-black text-gray-900 text-base">{activeOrder.orderNumber}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Pickup Window</span>
                  <div className="text-xs font-bold text-orange-600">{activeOrder.timeSlot}</div>
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

            {/* 2-MINUTE CANCELLATION / EDIT GRACE WINDOW CARD */}
            {orderStatus === 'CONFIRMED' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-amber-600" />
                    2-Minute Grace Window:
                  </span>
                  <span className="font-mono font-black text-sm bg-amber-200 text-amber-900 px-2 py-0.5 rounded-lg">
                    {formatTime(graceSeconds)} left
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Kitchen prep is locked during this window. You can cancel for an instant refund or edit item preferences.
                </p>
                {graceSeconds > 0 && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleCancelOrder}
                      className="flex-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel & Refund</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('menu')}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center space-x-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Edit Preferences</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 20-MINUTE READY PICKUP DEADLINE */}
            {orderStatus === 'READY' && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs">
                <div>
                  <span className="font-bold text-emerald-900 block flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-emerald-600" />
                    20-Min Pickup Deadline:
                  </span>
                  <span className="text-[11px] text-emerald-700">Orders uncollected past deadline are forfeited</span>
                </div>
                <span className="font-mono font-black text-sm bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg">
                  {formatTime(readySeconds)}
                </span>
              </div>
            )}

            {/* FORFEITED ALERT BANNER */}
            {orderStatus === 'FORFEITED' && (
              <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
                <h3 className="text-base font-black text-rose-900">Order Forfeited</h3>
                <p className="text-xs text-rose-700">
                  This order was not collected within the 20-minute deadline after becoming ready. As per campus canteen policy, uncollected food has been cleared.
                </p>
              </div>
            )}

            {/* REFUNDED ALERT BANNER */}
            {orderStatus === 'REFUNDED' && (
              <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto" />
                <h3 className="text-base font-black text-blue-900">Order Cancelled & Refunded</h3>
                <p className="text-xs text-blue-700">
                  You cancelled within the 2-minute grace window. ₹{activeOrder.totalAmount.toFixed(2)} has been refunded to your original payment method.
                </p>
              </div>
            )}

            {/* Main Pickup Pass Card */}
            {['CONFIRMED', 'PREPARING', 'READY', 'COLLECTED'].includes(orderStatus) && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-md text-center space-y-4 relative overflow-hidden">
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

                <div>
                  <h3 className="text-sm font-bold text-gray-800">Show at Canteen Counter</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Staff will scan your QR code or enter your 4-digit OTP</p>
                </div>

                {/* Dynamic QR Code Box */}
                <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-800 rounded-2xl flex flex-col items-center justify-center p-3 shadow-inner">
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
                      {activeOrder.otpCode}
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

                {/* Ordered Items Summary with Customizations */}
                <div className="text-left border-t border-gray-100 pt-3 space-y-2 text-xs text-gray-600">
                  <div className="font-bold text-gray-800">Items in this order:</div>
                  {activeOrder.items.map((i, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-medium">
                        <span>{i.qty}x {i.name}</span>
                        <span className="font-semibold text-gray-700">₹{i.price.toFixed(2)}</span>
                      </div>
                      {i.chosenCustomizations.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {i.chosenCustomizations.map((tag) => (
                            <span key={tag} className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                              ● {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-dashed border-gray-200">
                    <span>Total Paid (Razorpay)</span>
                    <span className="text-orange-600">₹{activeOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Simulation Controls for Reviewers */}
            <div className="bg-gray-100/80 rounded-2xl p-3 text-xs space-y-2 border border-gray-200">
              <div className="font-bold text-gray-700">Simulate Order Status:</div>
              <div className="grid grid-cols-5 gap-1">
                {['CONFIRMED', 'PREPARING', 'READY', 'COLLECTED', 'FORFEITED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatus(st)}
                    className={`py-1 rounded text-[9px] font-bold uppercase transition ${
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
          Menu & Custom
        </button>
        <button
          onClick={() => setActiveTab('pickup')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${
            activeTab === 'pickup' ? 'text-orange-600 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          Pickup Pass
        </button>
      </nav>
    </div>
  );
}
