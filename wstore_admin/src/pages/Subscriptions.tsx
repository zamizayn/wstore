import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, RefreshCw, XCircle, ArrowUpDown, Building2, Search, Loader2, Users, Clock, CheckCircle, AlertTriangle, Package, Sparkles } from 'lucide-react';
import PaginationBar from '../components/PaginationBar';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

interface Subscription {
  id: number;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  subscriptionPlanId: number;
  subscriptionStatus: 'trialing' | 'active' | 'expired' | 'cancelled';
  subscriptionStart: string;
  subscriptionEnd: string;
  paymentStatus: 'pending' | 'paid';
  isActive: boolean;
  productUsageCount?: number;
  SubscriptionPlan?: {
    id: number;
    name: string;
    price: number;
    durationDays: number;
    productLimit: number;
    features?: any;
  };
}

interface SubscriptionStats {
  total: number;
  trialing: number;
  active: number;
  expired: number;
  cancelled: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  expiringSoon: number;
}

export default function Subscriptions() {
  const role = localStorage.getItem('adminRole');
  const tenantId = localStorage.getItem('tenantId');
  const navigate = useNavigate();

  // Superadmin States
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Tenant / Branch States
  const [myTenant, setMyTenant] = useState<Subscription | null>(null);
  const [myHistory, setMyHistory] = useState<any[]>([]);

  // Common States
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [changePlanModal, setChangePlanModal] = useState<{ tenant: Subscription } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Superadmin: Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.SUBSCRIPTION_STATS, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  // Superadmin: Fetch subscriptions
  const fetchSubscriptions = async (page = 1) => {
    setLoading(true);
    try {
      let url = `${API_ENDPOINTS.SUBSCRIPTIONS}?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        setPagination({
          page: data.currentPage || 1,
          totalPages: data.pages || 1
        });
      }
    } catch (e) {
      console.error('Failed to fetch subscriptions:', e);
    } finally {
      setLoading(false);
    }
  };

  // Tenant/Branch: Fetch self data
  const fetchMyTenantData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current tenant details (including plan and dynamic product count)
      const tenantRes = await fetch(`${API_ENDPOINTS.TENANTS}/me`, { headers: getHeaders() });
      if (tenantRes.ok) {
        const tenantData = await tenantRes.json();
        setMyTenant(tenantData);
      }

      // 2. Fetch history
      if (tenantId) {
        const historyRes = await fetch(API_ENDPOINTS.SUBSCRIPTION_HISTORY(tenantId), { headers: getHeaders() });
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setMyHistory(historyData.history || []);
        }
      }

      // 3. Fetch available plans
      const plansRes = await fetch(API_ENDPOINTS.SUBSCRIPTION_PLANS, { headers: getHeaders() });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }
    } catch (e) {
      console.error('Failed to fetch tenant subscription data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Common: Fetch plans list
  const fetchPlans = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.SUBSCRIPTION_PLANS, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (e) {
      console.error('Failed to fetch plans:', e);
    }
  };

  useEffect(() => {
    if (role === 'superadmin') {
      fetchStats();
      fetchSubscriptions(1);
      fetchPlans();
    } else {
      fetchMyTenantData();
    }
  }, [search, statusFilter, role]);

  const handlePageChange = (newPage: number) => {
    if (role === 'superadmin') {
      fetchSubscriptions(newPage);
    }
  };

  const handleRenew = async (targetTenantId: number) => {
    if (!confirm('Renew this subscription for another billing cycle?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.SUBSCRIPTION_RENEW(targetTenantId), {
        method: 'PUT',
        headers: getHeaders()
      });
      if (res.ok) {
        if (role === 'superadmin') {
          fetchSubscriptions(pagination.page);
          fetchStats();
        } else {
          fetchMyTenantData();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to renew subscription');
      }
    } catch (e) {
      console.error('Failed to renew:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (targetTenantId: number) => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.SUBSCRIPTION_CANCEL(targetTenantId), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ reason: reason || 'Cancelled by user' })
      });
      if (res.ok) {
        if (role === 'superadmin') {
          fetchSubscriptions(pagination.page);
          fetchStats();
        } else {
          fetchMyTenantData();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (e) {
      console.error('Failed to cancel:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (customPlanId?: string) => {
    const planIdToSubmit = customPlanId || selectedPlanId;
    const targetTenantId = role === 'superadmin' ? changePlanModal?.tenant.id : tenantId;

    if (!targetTenantId || !planIdToSubmit) return;

    if (!confirm('Confirm subscription plan update? This will start a new billing period.')) return;

    setActionLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.SUBSCRIPTION_CHANGE_PLAN(targetTenantId), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ newPlanId: parseInt(planIdToSubmit) })
      });
      if (res.ok) {
        setChangePlanModal(null);
        setSelectedPlanId('');
        if (role === 'superadmin') {
          fetchSubscriptions(pagination.page);
          fetchStats();
        } else {
          fetchMyTenantData();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to change plan');
      }
    } catch (e) {
      console.error('Failed to change plan:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      trialing: { bg: '#e0f2fe', color: '#0369a1', label: 'Trialing' },
      active: { bg: '#dcfce7', color: '#15803d', label: 'Active' },
      expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' }
    };
    const s = styles[status] || { bg: '#f1f5f9', color: '#475569', label: status };
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: s.bg,
        color: s.color,
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600
      }}>
        {status === 'active' && <CheckCircle size={12} />}
        {status === 'expired' && <AlertTriangle size={12} />}
        {status === 'cancelled' && <XCircle size={12} />}
        {status === 'trialing' && <Clock size={12} />}
        {s.label}
      </span>
    );
  };

  const isExpiringSoon = (endDate: string) => {
    if (!endDate) return false;
    const diff = new Date(endDate).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  // --- TENANT & BRANCH VIEW ---
  if (role !== 'superadmin') {
    const activePlan = myTenant?.SubscriptionPlan;
    const productLimit = activePlan?.productLimit || 50;
    const isUnlimitedProducts = productLimit === 999999 || productLimit === -1;
    const productUsagePercent = isUnlimitedProducts ? 0 : Math.min(100, Math.round(((myTenant?.productUsageCount || 0) / productLimit) * 100));

    // Get current status gradient
    let statusGradient = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
    if (myTenant?.subscriptionStatus === 'trialing') {
      statusGradient = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
    } else if (myTenant?.subscriptionStatus === 'expired' || myTenant?.subscriptionStatus === 'cancelled') {
      statusGradient = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
    }

    return (
      <div className="dashboard-content">
        <header className="top-header">
          <div>
            <h1>Subscription Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              View status, subscribe to plans, or upgrade your account limits
            </p>
          </div>
        </header>

        {/* Current Plan Overview and Limits */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          {/* Plan Info Card */}
          <div className="white-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: statusGradient, color: '#fff', padding: '24px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, opacity: 0.8 }}>Current Plan</span>
                {myTenant && getStatusBadge(myTenant.subscriptionStatus)}
              </div>
              <h2 style={{ color: '#fff', fontSize: '28px', margin: '8px 0 0 0', fontWeight: 800 }}>
                {activePlan?.name || 'No Plan Active'}
              </h2>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '8px' }}>
                ₹{activePlan?.price || 0} <span style={{ fontSize: '14px', fontWeight: 400, opacity: 0.8 }}>/ {activePlan?.durationDays || 30} days</span>
              </div>
            </div>
            
            <div style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Billing Period Started:</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {myTenant?.subscriptionStart ? new Date(myTenant.subscriptionStart).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                  </strong>
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Valid Until:</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {myTenant?.subscriptionEnd ? new Date(myTenant.subscriptionEnd).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                  </strong>
                </p>
              </div>

              {myTenant?.subscriptionStatus !== 'cancelled' && myTenant?.id && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px' }}
                    onClick={() => handleRenew(myTenant.id)}
                    disabled={actionLoading}
                  >
                    <RefreshCw size={16} /> Renew Plan
                  </button>
                  <button
                    className="btn-outline"
                    style={{ padding: '10px', color: '#ef4444' }}
                    onClick={() => handleCancel(myTenant.id)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Usage Tracker Card */}
          <div className="white-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Product Usage</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Created products limit track</p>
                </div>
              </div>

              <div style={{ margin: '32px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 700 }}>
                  <span style={{ fontSize: '14px' }}>Catalog Capacity</span>
                  <span style={{ fontSize: '16px', color: 'var(--accent)' }}>
                    {myTenant?.productUsageCount || 0} / {isUnlimitedProducts ? 'Unlimited' : productLimit} Products
                  </span>
                </div>
                {!isUnlimitedProducts ? (
                  <>
                    <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: productUsagePercent > 85 ? '#ef4444' : 'var(--accent)',
                        width: `${productUsagePercent}%`,
                        borderRadius: '10px',
                        transition: 'width 0.4s ease'
                      }}></div>
                    </div>
                    {productUsagePercent >= 90 && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', color: '#ea580c', fontSize: '12px', fontWeight: 600 }}>
                        <AlertTriangle size={14} /> Catalog almost full! Consider upgrading to add more items.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ height: '10px', background: 'linear-gradient(90deg, #6366f1, #25d366)', borderRadius: '10px' }}></div>
                )}
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--bg-light)', borderRadius: '12px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <strong>Tip:</strong> Subscribing to a higher plan instantly increases your catalog limit and opens access to priority support and advanced marketing tools.
            </div>
          </div>
        </div>

        {/* Pricing Tables - Available Plans */}
        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 800 }}>Available Subscription Plans</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {plans.filter(p => p.isActive).map(plan => {
            const isCurrent = plan.id === activePlan?.id;
            let planFeatures: Record<string, any> = {};
            try {
              planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || {};
            } catch (err) {
              console.error('Error parsing plan features:', err);
            }

            return (
              <div
                key={plan.id}
                className="white-card"
                style={{
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                  position: 'relative',
                  transform: isCurrent ? 'scale(1.02)' : 'none',
                  boxShadow: isCurrent ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                  transition: 'all 0.3s ease'
                }}
              >
                {isCurrent && (
                  <span style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Active Plan
                  </span>
                )}

                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{plan.name}</h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', minHeight: '38px' }}>
                    {plan.description}
                  </p>

                  <div style={{ margin: '24px 0', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 900 }}>₹{plan.price}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ {plan.durationDays} days</span>
                  </div>

                  <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={16} style={{ color: '#15803d' }} />
                      <span>
                        <strong>{plan.productLimit === 999999 || plan.productLimit === -1 ? 'Unlimited' : plan.productLimit}</strong> Products capacity
                      </span>
                    </li>
                    {Object.entries(planFeatures).map(([key, val]) => {
                      if (key === 'maxProducts' || key === 'maxOrders' || key === 'maxBranches') return null;
                      const hasFeature = val === true || val === 'yes';
                      const labelMapping: Record<string, string> = {
                        hasAnalytics: 'Store Analytics Dashboard',
                        hasOffers: 'Discount & Offers System',
                        hasNotifications: 'WhatsApp Broadcasts & Alerts',
                        hasWhatsAppCatalog: 'Direct Meta Catalog Sync',
                        hasAISupport: 'Gemini AI Customer Assistant',
                        supportLevel: `Support level: ${val}`
                      };
                      return (
                        <li key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hasFeature ? 1 : 0.4 }}>
                          {hasFeature ? (
                            <CheckCircle size={16} style={{ color: '#15803d' }} />
                          ) : (
                            <XCircle size={16} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <span>{labelMapping[key] || `${key}: ${val}`}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div style={{ marginTop: '32px' }}>
                  <button
                    className={isCurrent ? 'btn-outline' : 'btn-primary'}
                    style={{ width: '100%', padding: '12px' }}
                    onClick={() => !isCurrent && handleChangePlan(String(plan.id))}
                    disabled={isCurrent || actionLoading}
                  >
                    {isCurrent ? 'Currently Subscribed' : 'Select Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* History Table */}
        <div className="white-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', background: '#f8fafc', color: 'var(--text-muted)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
              <Clock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Billing History</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Historical logs of plan renewals and modifications</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Action</th>
                  <th>Amount Paid</th>
                  <th>Period</th>
                  <th>Completed Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {myHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No billing history found.
                    </td>
                  </tr>
                ) : (
                  myHistory.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600 }}>{h.SubscriptionPlan?.name || 'Unknown'}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: h.action === 'upgraded' || h.action === 'renewed' ? '#dcfce7' : '#f1f5f9',
                          color: h.action === 'upgraded' || h.action === 'renewed' ? '#15803d' : '#475569'
                        }}>
                          {h.action}
                        </span>
                      </td>
                      <td>₹{h.amount || 0}</td>
                      <td>
                        {h.startDate ? new Date(h.startDate).toLocaleDateString() : '-'} to {h.endDate ? new Date(h.endDate).toLocaleDateString() : '-'}
                      </td>
                      <td>{h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '-'}</td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{h.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // --- SUPERADMIN VIEW ---
  return (
    <div className="dashboard-content">
      <header className="top-header">
        <div>
          <h1>Tenant Subscriptions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage subscriptions for all tenants on the platform
          </p>
        </div>
      </header>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'var(--accent)' },
            { label: 'Active', value: stats.active, icon: CheckCircle, color: '#15803d' },
            { label: 'Trialing', value: stats.trialing, icon: Clock, color: '#0369a1' },
            { label: 'Expired', value: stats.expired, icon: AlertTriangle, color: '#92400e' },
            { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: '#991b1b' },
            { label: 'Expiring Soon', value: stats.expiringSoon, icon: Clock, color: '#ea580c' },
            { label: 'Paid Reg.', value: stats.paidRegistrations, icon: CheckCircle, color: '#15803d' },
            { label: 'Pending Reg.', value: stats.pendingRegistrations, icon: Clock, color: '#92400e' }
          ].map(stat => (
            <div key={stat.label} className="white-card" style={{ padding: '16px', textAlign: 'center' }}>
              <stat.icon size={20} style={{ color: stat.color, marginBottom: '8px' }} />
              <div style={{ fontSize: '24px', fontWeight: 800 }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="white-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by tenant name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>
          <div className="input-group" style={{ minWidth: '160px', marginBottom: 0 }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="trialing">Trialing</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Period</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Building2 size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                    <p>No subscriptions found</p>
                  </td>
                </tr>
              ) : (
                subscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sub.name}</div>
                      {isExpiringSoon(sub.subscriptionEnd) && sub.subscriptionStatus === 'active' && (
                        <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 500 }}>Expiring soon</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{sub.contactName || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub.contactEmail || sub.contactPhone || ''}</div>
                    </td>
                    <td>
                      {sub.SubscriptionPlan ? (
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>{sub.SubscriptionPlan.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            ₹{sub.SubscriptionPlan.price}/mo - {sub.SubscriptionPlan.productLimit === 999999 || sub.SubscriptionPlan.productLimit === -1 ? 'Unlimited' : sub.SubscriptionPlan.productLimit} products
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No plan</span>
                      )}
                    </td>
                    <td>{getStatusBadge(sub.subscriptionStatus)}</td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        {sub.subscriptionStart ? new Date(sub.subscriptionStart).toLocaleDateString() : '-'}
                        <br />
                        {sub.subscriptionEnd ? new Date(sub.subscriptionEnd).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: sub.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                        color: sub.paymentStatus === 'paid' ? '#15803d' : '#92400e'
                      }}>
                        {sub.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-outline"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => handleRenew(sub.id)}
                          disabled={actionLoading || sub.subscriptionStatus === 'cancelled'}
                          title="Renew"
                        >
                          <RefreshCw size={14} /> Renew
                        </button>
                        <button
                          className="btn-outline"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => {
                            setChangePlanModal({ tenant: sub });
                            setSelectedPlanId(String(sub.subscriptionPlanId || ''));
                          }}
                          title="Change Plan"
                        >
                          <ArrowUpDown size={14} /> Change
                        </button>
                        {sub.subscriptionStatus !== 'cancelled' && (
                          <button
                            className="btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                            onClick={() => handleCancel(sub.id)}
                            disabled={actionLoading}
                            title="Cancel"
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div style={{ marginTop: '20px' }}>
            <PaginationBar
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {changePlanModal && (
        <div className="modal-overlay" onClick={() => !actionLoading && setChangePlanModal(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Plan for {changePlanModal.tenant.name}</h2>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div className="input-group">
                <label>Select New Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                >
                  <option value="">-- Select a plan --</option>
                  {plans.filter(p => p.isActive).map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}/mo ({plan.productLimit === 999999 || plan.productLimit === -1 ? 'Unlimited' : plan.productLimit} products)
                    </option>
                  ))}
                </select>
              </div>
              {selectedPlanId && changePlanModal.tenant.subscriptionPlanId && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#166534'
                }}>
                  <strong>Note:</strong> Changing plans will reset the billing period and apply any prorated charges.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setChangePlanModal(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleChangePlan()}
                disabled={!selectedPlanId || actionLoading}
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowUpDown size={18} />}
                Change Plan
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}