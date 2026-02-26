import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import type { BookingPayment, BookingPayout, PaymentMethod, Booking } from '@/types';
import { calcNannyPayBreakdown, estimateNannyPayBreakdown } from '@/utils/shiftHelpers';

interface PaymentPanelProps {
  booking: Booking;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',     label: 'Cash' },
  { value: 'bank',     label: 'Bank Transfer' },
  { value: 'card',     label: 'Card' },
  { value: 'transfer', label: 'Mobile Transfer' },
];

export default function PaymentPanel({ booking }: PaymentPanelProps) {
  const { adminProfile } = useData();

  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [payouts,  setPayouts]  = useState<BookingPayout[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Parent payment form
  const [showPayForm,   setShowPayForm]   = useState(false);
  const [payAmount,     setPayAmount]     = useState('');
  const [payMethod,     setPayMethod]     = useState<PaymentMethod>('cash');
  const [payReceivedBy, setPayReceivedBy] = useState(adminProfile?.name || '');
  const [payNote,       setPayNote]       = useState('');
  const [payBusy,       setPayBusy]       = useState(false);

  // Nanny payout form
  const [showOutForm, setShowOutForm] = useState(false);
  const [outAmount,   setOutAmount]   = useState('');
  const [outMethod,   setOutMethod]   = useState<PaymentMethod>('cash');
  const [outPaidBy,   setOutPaidBy]   = useState(adminProfile?.name || '');
  const [outNote,     setOutNote]     = useState('');
  const [outBusy,     setOutBusy]     = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}?include=payments`);
      if (!res.ok) return;
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPayments((data.payments || []).map((p: any): BookingPayment => ({
        id:         p.id,
        bookingId:  p.booking_id,
        amount:     p.amount,
        currency:   p.currency || 'EUR',
        method:     p.method as PaymentMethod,
        receivedBy: p.received_by,
        note:       p.note,
        createdAt:  p.created_at,
      })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPayouts((data.payouts || []).map((p: any): BookingPayout => ({
        id:        p.id,
        bookingId: p.booking_id,
        nannyId:   p.nanny_id,
        amount:    p.amount,
        currency:  p.currency || 'DH',
        method:    p.method as PaymentMethod,
        paidBy:    p.paid_by,
        note:      p.note,
        createdAt: p.created_at,
      })));
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ──────────────────────────────────────────────
  const totalPaid   = payments.reduce((s, p) => s + p.amount, 0);
  const balance     = (booking.totalPrice || 0) - totalPaid;

  const actualPay   = calcNannyPayBreakdown(booking);
  const nannyPay    = actualPay.total > 0
    ? actualPay
    : estimateNannyPayBreakdown(booking.startTime, booking.endTime, booking.date, booking.endDate);
  const isEstimated = actualPay.total === 0;

  const totalPaidOut   = payouts.reduce((s, p) => s + p.amount, 0);
  const payoutBalance  = nannyPay.total - totalPaidOut;

  // ── Handlers ────────────────────────────────────────────────────
  const handleAddPayment = async () => {
    const amt = parseInt(payAmount);
    if (!amt || amt <= 0) return;
    setPayBusy(true);
    try {
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addPayment', amount: amt, currency: 'EUR',
          method: payMethod, received_by: payReceivedBy, note: payNote,
        }),
      });
      setPayAmount(''); setPayNote(''); setShowPayForm(false);
      await fetchData();
    } finally { setPayBusy(false); }
  };

  const handleDeletePayment = async (paymentId: number) => {
    await fetch(`/api/bookings/${booking.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deletePayment', paymentId }),
    });
    await fetchData();
  };

  const handleAddPayout = async () => {
    const amt = parseInt(outAmount);
    if (!amt || amt <= 0) return;
    setOutBusy(true);
    try {
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addPayout', amount: amt, currency: 'DH',
          method: outMethod, paid_by: outPaidBy, note: outNote,
        }),
      });
      setOutAmount(''); setOutNote(''); setShowOutForm(false);
      await fetchData();
    } finally { setOutBusy(false); }
  };

  const handleDeletePayout = async (payoutId: number) => {
    await fetch(`/api/bookings/${booking.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deletePayout', payoutId }),
    });
    await fetchData();
  };

  // ── Shared sub-components ────────────────────────────────────────
  const inputCls = 'text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-violet-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Loading payment data…</span>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* ── PARENT PAYMENTS ──────────────────────────────────────── */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Parent Payment</h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            balance <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {balance <= 0 ? '✓ Settled' : `${balance}€ outstanding`}
          </span>
        </div>

        {/* Total charged */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total charged</span>
          <span className="font-semibold text-foreground">{booking.totalPrice}€</span>
        </div>

        {/* Payment entries */}
        {payments.length > 0 && (
          <div className="space-y-1.5">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="font-semibold text-green-800">{p.amount}€</span>
                  <span className="text-muted-foreground capitalize">{p.method}</span>
                  {p.receivedBy && <span className="text-muted-foreground hidden sm:inline">· {p.receivedBy}</span>}
                  {p.note && <span className="text-muted-foreground italic truncate">· {p.note}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">{format(new Date(p.createdAt), 'MMM d')}</span>
                  <button onClick={() => handleDeletePayment(p.id)} title="Delete">
                    <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600 transition-colors" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Running total */}
        {payments.length > 0 && (
          <div className="flex justify-between text-xs pt-1 border-t border-border">
            <span className="text-muted-foreground">Total received</span>
            <span className="font-semibold text-foreground">{totalPaid}€</span>
          </div>
        )}

        {/* Outstanding alert */}
        {balance > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Outstanding: <strong>{balance}€</strong></span>
          </div>
        )}

        {/* Add payment form */}
        {showPayForm ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex gap-2">
              <input
                type="number" min="1" placeholder="Amount (€)"
                value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className={`flex-1 ${inputCls}`}
              />
              <select
                value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                className={inputCls}
              >
                {METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <input
              type="text" placeholder="Received by"
              value={payReceivedBy} onChange={e => setPayReceivedBy(e.target.value)}
              className={`w-full ${inputCls}`}
            />
            <input
              type="text" placeholder="Note (optional)"
              value={payNote} onChange={e => setPayNote(e.target.value)}
              className={`w-full ${inputCls}`}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddPayment}
                disabled={payBusy || !payAmount}
                className="flex-1 flex items-center justify-center gap-1 text-xs bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {payBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Payment'}
              </button>
              <button
                onClick={() => setShowPayForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 border border-border rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPayForm(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 border border-dashed border-violet-300 rounded-lg py-2 hover:bg-violet-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Record Payment
          </button>
        )}
      </div>

      {/* ── NANNY PAYOUT ─────────────────────────────────────────── */}
      {booking.nannyId ? (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Nanny Payout</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              payoutBalance <= 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {payoutBalance <= 0 ? '✓ Paid' : `${payoutBalance} DH owed`}
            </span>
          </div>

          {/* Nanny earns */}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Nanny earns{isEstimated ? <span className="italic ml-1">(est.)</span> : ''}
            </span>
            <span className="font-semibold text-foreground">{nannyPay.total} DH</span>
          </div>
          {nannyPay.taxiFee > 0 && (
            <>
              <div className="flex justify-between text-xs text-muted-foreground pl-2">
                <span>· Base</span><span>{nannyPay.basePay} DH</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pl-2">
                <span>· Taxi</span><span>{nannyPay.taxiFee} DH</span>
              </div>
            </>
          )}

          {/* Payout entries */}
          {payouts.length > 0 && (
            <div className="space-y-1.5">
              {payouts.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-800">{p.amount} DH</span>
                    <span className="text-muted-foreground capitalize">{p.method}</span>
                    {p.paidBy && <span className="text-muted-foreground hidden sm:inline">· {p.paidBy}</span>}
                    {p.note && <span className="text-muted-foreground italic truncate">· {p.note}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">{format(new Date(p.createdAt), 'MMM d')}</span>
                    <button onClick={() => handleDeletePayout(p.id)} title="Delete">
                      <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600 transition-colors" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Running total */}
          {payouts.length > 0 && (
            <div className="flex justify-between text-xs pt-1 border-t border-border">
              <span className="text-muted-foreground">Total paid out</span>
              <span className="font-semibold text-foreground">{totalPaidOut} DH</span>
            </div>
          )}

          {/* Outstanding alert */}
          {payoutBalance > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Still owed: <strong>{payoutBalance} DH</strong></span>
            </div>
          )}

          {/* Add payout form */}
          {showOutForm ? (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="number" min="1" placeholder="Amount (DH)"
                  value={outAmount} onChange={e => setOutAmount(e.target.value)}
                  className={`flex-1 ${inputCls}`}
                />
                <select
                  value={outMethod} onChange={e => setOutMethod(e.target.value as PaymentMethod)}
                  className={inputCls}
                >
                  {METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <input
                type="text" placeholder="Paid by"
                value={outPaidBy} onChange={e => setOutPaidBy(e.target.value)}
                className={`w-full ${inputCls}`}
              />
              <input
                type="text" placeholder="Note (optional)"
                value={outNote} onChange={e => setOutNote(e.target.value)}
                className={`w-full ${inputCls}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddPayout}
                  disabled={outBusy || !outAmount}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-600 text-white rounded-lg py-2 font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {outBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Payout'}
                </button>
                <button
                  onClick={() => setShowOutForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 border border-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowOutForm(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 border border-dashed border-emerald-300 rounded-lg py-2 hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Record Payout
            </button>
          )}
        </div>
      ) : (
        <div className="bg-muted/20 border border-dashed border-border rounded-xl p-4 flex items-center justify-center text-xs text-muted-foreground">
          No nanny assigned — payout tracking available once nanny is assigned.
        </div>
      )}

    </div>
  );
}
