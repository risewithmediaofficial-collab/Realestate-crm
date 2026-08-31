// Generic placeholder pages for modules not yet fully implemented
// Each will be replaced with a full implementation in Phase 2+

import { Construction } from 'lucide-react';

const ComingSoon = ({ title, subtitle, icon: Icon }) => (
  <div>
    <div className="page-header">
      <div className="page-header-left">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
    <div className="card">
      <div className="empty-state" style={{ padding: '80px 40px' }}>
        <div className="empty-state-icon" style={{ width: 72, height: 72 }}>
          {Icon ? <Icon size={32} /> : <Construction size={32} />}
        </div>
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-desc">
          This module is being built. It will be fully functional in the next phase.
          The backend API and data models are already set up.
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="btn btn-primary">View Backend API</button>
          <button className="btn btn-secondary">Learn More</button>
        </div>
      </div>
    </div>
  </div>
);

export const MarketingPage = () => <ComingSoon title="Marketing" subtitle="Lead capture, campaigns, ROI analytics" />;
export const CampaignsPage = () => <ComingSoon title="Campaigns" subtitle="Meta Ads, Google Ads, drip campaigns" />;
export const LeadSourcesPage = () => <ComingSoon title="Lead Sources" subtitle="Track and analyze lead sources" />;
export const CommunicationPage = () => <ComingSoon title="Communication" subtitle="Calling, WhatsApp, Email, SMS" />;
export const ActivitiesPage = () => <ComingSoon title="Activities" subtitle="Tasks, follow-ups, meetings, reminders" />;
export const SalesPipelinePage = () => <ComingSoon title="Sales Pipeline" subtitle="Pipeline view and stage management" />;
export const PricingPage = () => <ComingSoon title="Pricing & Cost Sheets" subtitle="Base price, PLC, floor rise, cost sheet generator" />;
export const NegotiationsPage = () => <ComingSoon title="Negotiations & Approvals" subtitle="Discount requests and approval workflow" />;
export const SiteVisitsPage = () => <ComingSoon title="Site Visits" subtitle="Schedule, confirm, check-in, feedback" />;
export const BookingPage = () => <ComingSoon title="Booking" subtitle="Booking application, KYC, agreement docs" />;
export const PaymentsPage = () => <ComingSoon title="Payments & Collections" subtitle="Demand letters, invoices, receipts, outstanding" />;
export const ChannelPartnersPage = () => <ComingSoon title="Channel Partners" subtitle="Partner registration, commission, payouts" />;
export const CustomerPortalPage = () => <ComingSoon title="Customer Portal" subtitle="My property, documents, payment schedule" />;
export const AutomationPage = () => <ComingSoon title="Automation" subtitle="Workflow builder, triggers, conditions, actions" />;
export const ReportsPage = () => <ComingSoon title="Reports & Analytics" subtitle="Lead, sales, inventory, collection reports" />;
export const UsersPage = () => <ComingSoon title="Users & Organization" subtitle="Users, teams, roles, permissions, hierarchy" />;
export const SettingsPage = () => <ComingSoon title="Settings & Integrations" subtitle="Meta Ads, WhatsApp, telephony, API keys" />;
