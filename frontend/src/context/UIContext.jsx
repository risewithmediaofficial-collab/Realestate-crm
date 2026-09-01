import { createContext, useContext, useState } from 'react';
import CreateLeadModal from '../components/leads/CreateLeadModal';
import SmartDialerWidget from '../components/telephony/SmartDialerWidget';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [simulatedRole, setSimulatedRole] = useState(null);

  const openCreateLead = () => setIsCreateLeadOpen(true);
  const closeCreateLead = () => setIsCreateLeadOpen(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(p => !p);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const startCall = (contact) => {
    setActiveCall(contact);
  };

  const endCall = () => {
    setActiveCall(null);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLeadCreated = (lead) => {
    showNotification(`Lead "${lead.name}" created successfully!`, 'success');
    // Dispatch a custom event so active pages can update their state
    window.dispatchEvent(new CustomEvent('lead_created', { detail: lead }));
  };

  return (
    <UIContext.Provider value={{
      isCreateLeadOpen, openCreateLead, closeCreateLead,
      isMobileMenuOpen, setIsMobileMenuOpen, toggleMobileMenu, closeMobileMenu,
      showNotification, activeCall, startCall, endCall,
      simulatedRole, setSimulatedRole
    }}>
      {children}
      {isCreateLeadOpen && (
        <CreateLeadModal
          onClose={closeCreateLead}
          onCreated={handleLeadCreated}
        />
      )}
      <SmartDialerWidget />
      {notification && (
        <div style={{
          position: 'fixed', bottom: activeCall ? 100 : 24, right: 24, zIndex: 9999,
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 20px', borderRadius: 8,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontWeight: 600, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideUp 0.2s ease'
        }}>
          {notification.message}
        </div>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) {
    return {
      isCreateLeadOpen: false,
      openCreateLead: () => {},
      closeCreateLead: () => {},
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: () => {},
      toggleMobileMenu: () => {},
      closeMobileMenu: () => {},
      showNotification: () => {},
      activeCall: null,
      startCall: () => {},
      endCall: () => {},
      simulatedRole: null,
      setSimulatedRole: () => {}
    };
  }
  return ctx;
};
