import React, { useState } from 'react';
import { ChefHat, ClipboardList, ScanLine, Boxes, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('verify');
  const [tokenInput, setTokenInput] = useState('7492');
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorResult, setErrorResult] = useState(null);
  const [redeemedTokens, setRedeemedTokens] = useState({});

  // Mock DB record matching the seeded sample order
  const sampleOrder = {
    orderNumber: 'RH-2026-001',
    otpCode: '7492',
    qrPayload: 'rh_token_live_sha256_hash_7492_rh2026001',
    studentName: 'Hariharan K',
    rollNumber: '21CS102',
    items: ['1x Wok Tossed Veg Hakka Noodles', '1x Crispy Punjabi Samosa (2 pcs)'],
    totalAmount: 100.00,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
  };

  const handleVerify = (e) => {
    e?.preventDefault();
    setErrorResult(null);
    setVerificationResult(null);

    const token = tokenInput.trim();
    if (!token) return;

    // Check if token matches our sample order
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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-600 rounded-xl text-white shadow">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Rush Hours Staff Portal</h1>
            <p className="text-xs text-gray-500 font-medium">Main Campus Food Court • Counter #1</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Counter Online
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex max-w-6xl w-full mx-auto p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between shrink-0">
          <nav className="space-y-1.5">
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
              <span className="ml-auto bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                1 Ready
              </span>
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

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-700">Scanner Engine</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">v1.2</span>
            </div>
            <p className="text-gray-500 text-[11px]">Single-use token enforcement active</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
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

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Incoming & Active Orders Queue</h2>
                <span className="text-xs text-gray-500">1 Order Ready for Pickup</span>
              </div>

              <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-mono font-bold text-gray-900">Order #RH-2026-001</div>
                  <span className="text-xs font-bold uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-full">
                    READY FOR PICKUP
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>1x Wok Tossed Veg Hakka Noodles</div>
                  <div>1x Crispy Punjabi Samosa (2 pcs)</div>
                </div>
                <div className="text-xs text-gray-500 pt-2 border-t border-emerald-100 flex justify-between">
                  <span>Student: Hariharan K (21CS102)</span>
                  <span className="font-mono font-bold text-emerald-800">OTP: 7492</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Real-time Stock Control</h2>
              <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-xs">
                Use this screen to toggle out-of-stock items in real-time during service rush.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
