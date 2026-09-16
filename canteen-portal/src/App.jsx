import React, { useState } from 'react';
import {
  ChefHat,
  ClipboardList,
  ScanLine,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Flame,
  PauseCircle,
  PlayCircle,
  Users
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('slots'); // 'slots' | 'verify' | 'orders' | 'stock'
  const [tokenInput, setTokenInput] = useState('7492');
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorResult, setErrorResult] = useState(null);
  const [redeemedTokens, setRedeemedTokens] = useState({});
  const [ordersPaused, setOrdersPaused] = useState(false); // One-tap toggle

  // Upcoming Slots with Queue-Load data
  const upcomingSlots = [
    {
      id: 'slot-1',
      time: '12:30 - 12:45 PM',
      maxOrders: 25,
      currentOrders: 23,
      loadPercent: 92,
      level: 'red', // red >= 85%
      label: 'Heavy Rush (Near Cap)',
      batchPrep: [
        { item: 'Wok Tossed Veg Hakka Noodles', count: 14 },
        { item: 'Crispy Punjabi Samosa', count: 18 },
        { item: 'South Indian Executive Thali', count: 6 },
      ],
      orders: ['RH-2026-001 (Hariharan K)', 'RH-2026-002 (Sathappan T)', 'RH-2026-003 (Priya R)'],
    },
    {
      id: 'slot-2',
      time: '12:45 - 01:00 PM',
      maxOrders: 25,
      currentOrders: 18,
      loadPercent: 72,
      level: 'yellow', // yellow 60-84%
      label: 'Busy (Prep Ahead)',
      batchPrep: [
        { item: 'South Indian Executive Thali', count: 12 },
        { item: 'Fresh Mint Lime Soda', count: 10 },
        { item: 'Wok Tossed Veg Hakka Noodles', count: 8 },
      ],
      orders: ['RH-2026-004 (Arun M)', 'RH-2026-005 (Kavita S)'],
    },
    {
      id: 'slot-3',
      time: '01:00 - 01:15 PM',
      maxOrders: 20,
      currentOrders: 9,
      loadPercent: 45,
      level: 'green', // green < 60%
      label: 'Normal Flow',
      batchPrep: [
        { item: 'Crispy Punjabi Samosa', count: 6 },
        { item: 'Fresh Mint Lime Soda', count: 5 },
      ],
      orders: ['RH-2026-006 (Divya P)'],
    },
    {
      id: 'slot-4',
      time: '01:15 - 01:30 PM',
      maxOrders: 20,
      currentOrders: 3,
      loadPercent: 15,
      level: 'green',
      label: 'Light Load',
      batchPrep: [{ item: 'South Indian Executive Thali', count: 3 }],
      orders: ['RH-2026-007 (Rahul G)'],
    },
  ];

  // Sample order for verification
  const sampleOrder = {
    orderNumber: 'RH-2026-001',
    otpCode: '7492',
    qrPayload: 'rh_token_live_sha256_hash_7492_rh2026001',
    studentName: 'Hariharan K',
    rollNumber: '21CS102',
    slotTime: '12:30 - 12:45 PM',
    items: ['1x Wok Tossed Veg Hakka Noodles', '1x Crispy Punjabi Samosa (2 pcs)'],
    totalAmount: 100.00,
  };

  const handleVerify = (e) => {
    e?.preventDefault();
    setErrorResult(null);
    setVerificationResult(null);

    const token = tokenInput.trim();
    if (!token) return;

    if (token !== sampleOrder.otpCode && token !== sampleOrder.qrPayload) {
      setErrorResult({
        type: 'NOT_FOUND',
        title: 'Token Not Found',
        message: 'No active order matching this OTP or QR code was found for this canteen.',
      });
      return;
    }

    // 1. SINGLE-USE REJECTION CHECK
    if (redeemedTokens[token]) {
      const usedAtTime = redeemedTokens[token];
      setErrorResult({
        type: 'DUPLICATE_REDEEMED',
        title: 'SECURITY ALERT: Duplicate Scan Blocked',
        message: `This pickup token was already redeemed and collected at ${usedAtTime}. Any second hand-over attempt is strictly rejected.`,
        orderNumber: sampleOrder.orderNumber,
        studentName: sampleOrder.studentName,
        usedAt: usedAtTime,
      });
      return;
    }

    // 2. SUCCESSFUL FIRST REDEMPTION
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setRedeemedTokens((prev) => ({
      ...prev,
      [sampleOrder.otpCode]: nowTime,
      [sampleOrder.qrPayload]: nowTime,
    }));

    setVerificationResult({
      orderNumber: sampleOrder.orderNumber,
      studentName: sampleOrder.studentName,
      rollNumber: sampleOrder.rollNumber,
      items: sampleOrder.items,
      totalAmount: sampleOrder.totalAmount,
      collectedAt: nowTime,
    });
  };

  const resetScanner = () => {
    setRedeemedTokens({});
    setVerificationResult(null);
    setErrorResult(null);
    setTokenInput('7492');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-600 rounded-xl text-white shadow">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Rush Hours Staff Portal</h1>
            <p className="text-xs text-gray-500 font-medium">Main Campus Food Court • Kitchen & Counter</p>
          </div>
        </div>

        {/* Status Badges & ONE-TAP PAUSE TOGGLE */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {ordersPaused ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-600 mr-1.5"></span>
                Orders Paused
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Accepting Orders
              </span>
            )}
          </div>

          {/* ONE-TAP PAUSE BUTTON */}
          <button
            onClick={() => setOrdersPaused(!ordersPaused)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              ordersPaused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {ordersPaused ? (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Resume New Orders</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4" />
                <span>Pause New Orders</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* PAUSE STATUS BANNER */}
      {ordersPaused && (
        <div className="bg-rose-600 text-white px-6 py-2.5 text-center text-xs font-bold shadow flex items-center justify-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>NEW ORDERS ARE PAUSED: Students cannot place new orders until you tap Resume. Existing orders are unaffected.</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between shrink-0 h-fit">
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('slots')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'slots'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>Slots & Queue Load</span>
              <span className="ml-auto bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.5 rounded font-black">
                1 Red
              </span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'verify'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ScanLine className="w-5 h-5" />
              <span>Verify & Collect</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Live Order Queue</span>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Boxes className="w-5 h-5" />
              <span>Stock Control</span>
            </button>
          </nav>

          <div className="mt-8 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
            <div className="font-bold text-gray-700">Queue Capacity Pacing</div>
            <div className="flex items-center space-x-1.5 text-[11px] text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>&lt; 60%: Normal</span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>60-84%: Busy</span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>&gt;= 85%: Heavy Rush</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {/* TAB 1: SLOTS & QUEUE LOAD DASHBOARD */}
          {activeTab === 'slots' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Upcoming Slots & Queue Load</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live capacity pacing and batch preparation counts per 15-minute pickup window
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-semibold">Total Orders Next Hour</span>
                  <span className="text-lg font-black text-gray-800">53 orders</span>
                </div>
              </div>

              {/* SLOTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingSlots.map((slot) => {
                  const isRed = slot.level === 'red';
                  const isYellow = slot.level === 'yellow';
                  const isGreen = slot.level === 'green';

                  return (
                    <div
                      key={slot.id}
                      className={`p-5 rounded-2xl border-2 transition shadow-xs flex flex-col justify-between space-y-4 ${
                        isRed
                          ? 'bg-rose-50/40 border-rose-300'
                          : isYellow
                          ? 'bg-amber-50/40 border-amber-300'
                          : 'bg-emerald-50/30 border-emerald-200'
                      }`}
                    >
                      {/* Slot Header */}
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-base font-black text-gray-900">{slot.time}</span>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {slot.currentOrders} / {slot.maxOrders} orders booked ({slot.maxOrders - slot.currentOrders} left)
                            </div>
                          </div>

                          {/* QUEUE LOAD PILL */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                              isRed
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isYellow
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            ● {slot.label} ({slot.loadPercent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mt-3">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isRed ? 'bg-rose-600' : isYellow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${slot.loadPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Batch Cooking Preparation Checklist */}
                      <div className="bg-white/90 rounded-xl p-3.5 border border-gray-200 text-xs space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-gray-700 font-bold border-b border-gray-100 pb-1">
                          <span className="flex items-center">
                            <Flame className="w-3.5 h-3.5 mr-1 text-orange-500" />
                            Batch Cooking Requirement:
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">To prepare now</span>
                        </div>
                        <div className="space-y-1 pt-0.5">
                          {slot.batchPrep.map((bp, i) => (
                            <div key={i} className="flex justify-between text-gray-800">
                              <span>{bp.item}</span>
                              <span className="font-mono font-bold bg-gray-100 px-1.5 rounded text-gray-900">
                                {bp.count} portions
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VERIFY PICKUP & SCANNER */}
          {activeTab === 'verify' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <ScanLine className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-black text-gray-900 pt-2">Order Pickup Verification</h2>
                <p className="text-xs text-gray-500">
                  Enter student's 4-digit OTP or scan dynamic QR payload to hand over order
                </p>
              </div>

              {/* Input Form */}
              <form onSubmit={handleVerify} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter 4-Digit OTP or QR Token"
                    className="flex-1 font-mono text-center text-xl font-bold tracking-wider py-3 px-4 rounded-xl border-2 border-gray-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-xl transition shadow-md flex items-center space-x-2 text-sm"
                  >
                    <span>Verify</span>
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                  <span>Sample Student OTP: <button type="button" onClick={() => setTokenInput('7492')} className="font-mono font-bold text-emerald-700 underline">7492</button></span>
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="text-gray-500 hover:text-gray-800 flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Demo State</span>
                  </button>
                </div>
              </form>

              {/* SUCCESS RESULT CARD */}
              {verificationResult && (
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 space-y-4 shadow animate-fadeIn">
                  <div className="flex items-center space-x-3 text-emerald-800">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="text-base font-black text-emerald-900">VERIFIED: Hand Over Meal Now</h3>
                      <p className="text-xs text-emerald-700">Order status updated to <strong>COLLECTED</strong> at {verificationResult.collectedAt}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-emerald-200 text-xs space-y-2">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Student:</span>
                      <span className="font-bold text-gray-800">{verificationResult.studentName} ({verificationResult.rollNumber})</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Order Ref:</span>
                      <span className="font-mono font-bold text-gray-800">{verificationResult.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1 font-semibold">Items to hand over:</span>
                      <ul className="list-disc list-inside font-bold text-gray-800 space-y-0.5">
                        {verificationResult.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-800 bg-emerald-100/80 p-2.5 rounded-xl text-center font-medium">
                    🔒 Token has been invalidated. Any future scan will be rejected as duplicate.
                  </div>
                </div>
              )}

              {/* SECURITY REJECTION ALERT (DUPLICATE SCAN OR EXPIRED) */}
              {errorResult && (
                <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-5 space-y-3 shadow animate-fadeIn">
                  <div className="flex items-center space-x-3 text-rose-900">
                    <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
                    <div>
                      <h3 className="text-base font-black text-rose-900">{errorResult.title}</h3>
                      <p className="text-xs text-rose-700 mt-0.5">{errorResult.message}</p>
                    </div>
                  </div>

                  {errorResult.type === 'DUPLICATE_REDEEMED' && (
                    <div className="bg-white rounded-xl p-3.5 border border-rose-200 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order Ref:</span>
                        <span className="font-mono font-bold text-gray-800">{errorResult.orderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Student:</span>
                        <span className="font-bold text-gray-800">{errorResult.studentName}</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span>Original Redemption:</span>
                        <span className="font-mono">{errorResult.usedAt}</span>
                      </div>
                      <div className="pt-2 text-center text-rose-800 font-bold border-t border-rose-100">
                        ⛔ DO NOT HAND OVER FOOD AGAIN
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDERS QUEUE */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Live Kitchen & Counter Tickets</h2>
                  <p className="text-xs text-gray-500">
                    Order state machine with 2-min student edit/cancellation grace lockout and 20-min ready forfeiture deadline
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">Slot: 12:30 - 12:45 PM</span>
              </div>

              {/* Order Card 1: CONFIRMED - Locked by Grace Window */}
              <div className="border-2 border-amber-200 bg-amber-50/40 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-gray-900 text-base">RH-2026-002</span>
                      <span className="text-[11px] font-black uppercase bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                        CONFIRMED (IN GRACE WINDOW)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Student: Sathappan T (21CS089) • Paid ₹140.00 via Razorpay</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg inline-flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Grace: 48s remaining</span>
                    </span>
                  </div>
                </div>

                {/* Items with Customizations */}
                <div className="bg-white rounded-xl p-3.5 border border-amber-200 space-y-2.5 text-xs">
                  <div className="font-bold text-gray-700 border-b border-gray-100 pb-1 flex justify-between">
                    <span>Ticket Items & Customizations:</span>
                    <span className="text-[10px] text-amber-700 font-semibold">Student can cancel/edit during grace</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-gray-900">1x South Indian Executive Thali</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded border border-rose-200">
                            🚫 NO ONION
                          </span>
                          <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded border border-orange-200">
                            🌶️ EXTRA SPICY
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-gray-500">₹140.00</span>
                    </div>
                  </div>
                </div>

                {/* State Machine Action Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                  <div className="text-[11px] text-amber-800 font-medium flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Kitchen preparation is locked until the 2-minute student grace window elapses.</span>
                  </div>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 cursor-not-allowed font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    Start Preparing (Locked)
                  </button>
                </div>
              </div>

              {/* Order Card 2: PREPARING -> Move to READY */}
              <div className="border-2 border-blue-200 bg-blue-50/40 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-gray-900 text-base">RH-2026-003</span>
                      <span className="text-[11px] font-black uppercase bg-blue-200 text-blue-900 px-2.5 py-0.5 rounded-full border border-blue-300">
                        PREPARING IN KITCHEN
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Student: Priya R (21EC045) • Paid ₹85.00 via Razorpay</p>
                  </div>
                </div>

                {/* Items with Customizations */}
                <div className="bg-white rounded-xl p-3.5 border border-blue-200 space-y-2.5 text-xs">
                  <div className="font-bold text-gray-700 border-b border-gray-100 pb-1">
                    Ticket Items & Customizations:
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-gray-900">1x Wok Tossed Veg Hakka Noodles</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-200">
                            🧊 LESS OIL
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-gray-500">₹85.00</span>
                    </div>
                  </div>
                </div>

                {/* State Machine Action Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                  <div className="text-[11px] text-gray-500">
                    Grace window completed. Moving to READY triggers the 20-minute pickup window timer.
                  </div>
                  <button
                    onClick={() => alert("Order marked READY! 20-minute pickup deadline started.")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
                  >
                    Mark Ready for Pickup
                  </button>
                </div>
              </div>

              {/* Order Card 3: READY FOR PICKUP - Active 20-min countdown */}
              <div className="border-2 border-emerald-300 bg-emerald-50/40 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-gray-900 text-base">RH-2026-001</span>
                      <span className="text-[11px] font-black uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                        READY FOR PICKUP
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Student: Hariharan K (21CS102) • Ready since 12:35 PM</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg inline-flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pickup Deadline: 14m 12s left</span>
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-emerald-200 space-y-2 text-xs">
                  <div className="font-bold text-gray-700 border-b border-gray-100 pb-1">
                    Ready Items:
                  </div>
                  <div className="text-gray-800 space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>1x Wok Tossed Veg Hakka Noodles</span>
                      <span className="font-mono text-gray-500">₹65.00</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>1x Crispy Punjabi Samosa (2 pcs)</span>
                      <span className="font-mono text-gray-500">₹35.00</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-emerald-200 text-xs">
                  <div className="text-[11px] text-emerald-800 font-medium">
                    Waiting for student at counter. Use <strong>Verify & Collect</strong> tab to scan QR/OTP.
                  </div>
                  <span className="font-mono font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-lg border border-emerald-300">
                    OTP: 7492
                  </span>
                </div>
              </div>

              {/* Order Card 4: FORFEITED - Exceeded 20-min deadline */}
              <div className="border-2 border-gray-300 bg-gray-50 rounded-2xl p-5 space-y-3 opacity-80 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-gray-700 text-base">RH-2026-000</span>
                      <span className="text-[11px] font-black uppercase bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full border border-gray-300">
                        FORFEITED (UNCOLLECTED)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Student: Vikram N (21ME032) • Expired at 12:20 PM</p>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                    🚨 &gt; 20 Mins Past Ready
                  </span>
                </div>
                <div className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
                  <span>1x Chole Bhature Combo (Special Gravy)</span>
                  <div className="text-[11px] text-gray-400 mt-1">
                    System automatically swept and marked order as forfeited. QR/OTP token revoked.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STOCK CONTROL */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Real-time Stock Control</h2>
              <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-xs">
                Toggle countable items out-of-stock instantly during peak lunch rushes.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
