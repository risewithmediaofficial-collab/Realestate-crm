import { useState, useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, Pause, Play,
  Clock, CheckCircle, Calendar, MessageSquare, Plus, ArrowRight,
  X, Sparkles, User, AlertCircle, FileText
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { formatDateTime } from '../../utils/formatters';
import CustomSelect from '../ui/CustomSelect';

export const CALL_DISPOSITIONS = [
  { value: 'site_visit_requested', label: '🎯 Interested — Site Visit Requested', category: 'positive' },
  { value: 'callback_scheduled', label: '📅 Callback / Follow-Up Scheduled', category: 'positive' },
  { value: 'quote_requested', label: '💰 Sent Cost Sheet & Quotation', category: 'positive' },
  { value: 'rnr', label: '🔔 RNR (Ringing No Response)', category: 'neutral' },
  { value: 'not_reachable', label: '📵 Switched Off / Not Reachable', category: 'neutral' },
  { value: 'busy', label: '⏳ Busy — Asked to Call Back Later', category: 'neutral' },
  { value: 'budget_mismatch', label: '💸 Budget Mismatch (>20% variance)', category: 'negative' },
  { value: 'location_mismatch', label: '📍 Location Not Preferred', category: 'negative' },
  { value: 'already_purchased', label: '🏢 Already Purchased from Competitor', category: 'negative' },
  { value: 'invalid_number', label: '❌ Invalid / Junk Lead', category: 'negative' },
];

export default function SmartDialerWidget() {
  const { activeCall, endCall, showNotification } = useUI();
  const [callState, setCallState] = useState('connecting'); // 'connecting' | 'connected' | 'disposition'
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(true);

  // Disposition form state
  const [disposition, setDisposition] = useState('callback_scheduled');
  const [callNotes, setCallNotes] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600000);
    tomorrow.setHours(11, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [followUpType, setFollowUpType] = useState('call');

  const timerRef = useRef(null);

  useEffect(() => {
    if (activeCall) {
      setCallState('connecting');
      setDuration(0);
      setIsMuted(false);
      setIsOnHold(false);
      setIsRecording(true);
      setCallNotes('');
      setDisposition('callback_scheduled');

      // Simulate connection in 1.5s
      const connectTimeout = setTimeout(() => {
        setCallState('connected');
      }, 1500);

      return () => clearTimeout(connectTimeout);
    }
  }, [activeCall]);

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (!activeCall) return null;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleHangup = () => {
    setCallState('disposition');
  };

  const handleSaveDisposition = (e) => {
    e.preventDefault();
    const dispObj = CALL_DISPOSITIONS.find(d => d.value === disposition);

    // Trigger custom event so lead timeline updates
    window.dispatchEvent(new CustomEvent('call_completed', {
      detail: {
        leadId: activeCall.id || activeCall._id,
        duration,
        disposition: dispObj?.label || disposition,
        notes: callNotes,
        followUp: scheduleFollowUp ? { date: followUpDate, type: followUpType } : null,
        timestamp: new Date()
      }
    }));

    showNotification(`Call logged: ${dispObj?.label || disposition} (${formatTimer(duration)})`);
    endCall();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: callState === 'disposition' ? 420 : 360,
      background: '#ffffff',
      borderRadius: 16,
      boxShadow: '0 20px 40px -8px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
      zIndex: 10000,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      animation: 'slideUp 0.3s ease'
    }}>
      {/* Header bar */}
      <div style={{
        background: callState === 'connecting'
          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
          : callState === 'connected'
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        color: '#ffffff',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14
          }}>
            📞
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9, fontWeight: 700 }}>
              {callState === 'connecting' ? 'Connecting to Cloud PBX...' : callState === 'connected' ? 'Live Telephony Call' : 'Call Wrap-Up & Disposition'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {activeCall.name || 'Prospective Buyer'}
            </div>
          </div>
        </div>

        {callState === 'connected' && (
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
            {formatTimer(duration)}
          </div>
        )}
      </div>

      {/* Main Calling Stage */}
      {callState !== 'disposition' ? (
        <div style={{ padding: '20px 22px' }}>
          {/* Contact Details */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{activeCall.phone || '+91 98000 00000'}</span>
              <span className="badge badge-primary" style={{ fontSize: 10 }}>{activeCall.project?.name || activeCall.project || 'Green Valley'}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Unit Interest: {activeCall.interestedUnitType || '2/3 BHK Apartment'} · Source: {activeCall.source || 'Meta Ads'}
            </div>
          </div>

          {/* Audio Visualizer Mock */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            height: 36,
            marginBottom: 20
          }}>
            {[14, 28, 18, 34, 22, 38, 16, 26, 32, 14, 30, 20, 36, 18].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: callState === 'connected' && !isOnHold ? `${h}px` : '4px',
                  background: isOnHold ? '#94a3b8' : 'linear-gradient(to top, #2563eb, #38bdf8)',
                  borderRadius: 2,
                  transition: 'height 0.2s ease',
                  animation: callState === 'connected' && !isOnHold ? `soundWave 0.8s ease-in-out infinite ${i * 0.08}s` : 'none'
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes soundWave {
              0%, 100% { transform: scaleY(0.4); }
              50% { transform: scaleY(1.2); }
            }
          `}</style>

          {/* In-Call Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
            <button
              onClick={() => setIsMuted(p => !p)}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isMuted ? '#fee2e2' : '#f1f5f9',
                color: isMuted ? '#ef4444' : '#475569',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
              title={isMuted ? 'Unmute' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={() => setIsOnHold(p => !p)}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isOnHold ? '#fef3c7' : '#f1f5f9',
                color: isOnHold ? '#d97706' : '#475569',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
              title={isOnHold ? 'Resume Call' : 'Hold Call'}
            >
              {isOnHold ? <Play size={18} /> : <Pause size={18} />}
            </button>

            <button
              onClick={() => setIsRecording(p => !p)}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isRecording ? '#dcfce7' : '#f1f5f9',
                color: isRecording ? '#16a34a' : '#94a3b8',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
              title={isRecording ? 'Recording Live (Compliance)' : 'Recording Paused'}
            >
              <Volume2 size={18} />
            </button>

            <button
              onClick={handleHangup}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                transition: 'all 0.15s'
              }}
              title="End Call"
            >
              <PhoneOff size={20} />
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
            {isRecording ? '🔴 Call is being recorded for RERA compliance' : '⚪ Recording muted'}
          </div>
        </div>
      ) : (
        /* Disposition & Wrap-Up Stage */
        <form onSubmit={handleSaveDisposition} style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Duration: <strong>{formatTimer(duration)}</strong>
            </div>
            <span className="badge badge-success" style={{ fontSize: 10 }}>Call Completed</span>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Select Call Disposition <span className="required">*</span></label>
            <CustomSelect
              value={disposition}
              onChange={val => setDisposition(typeof val === 'object' && val.target ? val.target.value : val)}
              placeholder="Select disposition"
              options={CALL_DISPOSITIONS.map(d => ({
                value: d.value,
                label: d.label
              }))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Call Notes & Customer Feedback</label>
            <textarea
              className="form-input"
              rows={2}
              style={{ fontSize: 12, resize: 'none' }}
              placeholder="e.g. Wants 3BHK east-facing on 5th floor. Budget 1.2 Cr. Asked to schedule site visit for Saturday..."
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
            />
          </div>

          {/* Follow-up scheduler */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: scheduleFollowUp ? 8 : 0 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scheduleFollowUp}
                  onChange={e => setScheduleFollowUp(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                Schedule Next Follow-Up SLA
              </label>
              {scheduleFollowUp && <span className="badge badge-warning" style={{ fontSize: 9 }}>Task SLA</span>}
            </div>

            {scheduleFollowUp && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 8 }}>
                <CustomSelect
                  value={followUpType}
                  onChange={val => setFollowUpType(typeof val === 'object' && val.target ? val.target.value : val)}
                  size="sm"
                  options={[
                    { value: 'call', label: 'Follow-up Call', icon: '📞' },
                    { value: 'site_visit', label: 'Site Visit Tour', icon: '🏠' },
                    { value: 'whatsapp', label: 'Send Brochure on WhatsApp', icon: '💬' },
                    { value: 'meeting', label: 'Direct Meeting', icon: '🤝' }
                  ]}
                />
                <input
                  type="datetime-local"
                  className="form-input"
                  style={{ fontSize: 11, padding: '5px 8px' }}
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  required={scheduleFollowUp}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
              onClick={endCall}
            >
              Discard
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ flex: 2, justifyContent: 'center', fontSize: 12 }}
            >
              <CheckCircle size={13} /> Save Disposition
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
