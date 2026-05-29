import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, CreditCard, IndianRupee, Package, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  productLimit: number;
  features: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormData {
  name: string;
  description: string;
  price: string;
  durationDays: string;
  productLimit: string;
  features: string;
  sortOrder: string;
}

const emptyForm: PlanFormData = {
  name: '',
  description: '',
  price: '',
  durationDays: '30',
  productLimit: '50',
  features: '{}',
  sortOrder: '0'
};

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.SUBSCRIPTION_PLANS, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (e) {
      console.error('Failed to fetch subscription plans:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      durationDays: String(plan.durationDays || 30),
      productLimit: String(plan.productLimit || 50),
      features: JSON.stringify(plan.features || {}, null, 2),
      sortOrder: String(plan.sortOrder || 0)
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let parsedFeatures = {};
      try {
        parsedFeatures = JSON.parse(formData.features);
      } catch {
        setError('Invalid JSON in features field');
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        durationDays: parseInt(formData.durationDays),
        productLimit: parseInt(formData.productLimit),
        features: parsedFeatures,
        sortOrder: parseInt(formData.sortOrder)
      };

      const url = editingId
        ? `${API_ENDPOINTS.SUBSCRIPTION_PLANS}/${editingId}`
        : API_ENDPOINTS.SUBSCRIPTION_PLANS;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchPlans();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save plan');
      }
    } catch (e: any) {
      setError(e.message || 'Connection error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan: SubscriptionPlan) => {
    try {
      const res = await fetch(API_ENDPOINTS.SUBSCRIPTION_PLAN_TOGGLE(plan.id), {
        method: 'PUT',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch (e) {
      console.error('Failed to toggle plan:', e);
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Are you sure you want to delete "${plan.name}"?`)) return;

    try {
      const res = await fetch(`${API_ENDPOINTS.SUBSCRIPTION_PLANS}/${plan.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchPlans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete plan');
      }
    } catch (e) {
      console.error('Failed to delete plan:', e);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <header className="top-header">
        <div>
          <h1>Subscription Plans</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage subscription plans and pricing for tenants
          </p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Create Plan
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
        {plans.length === 0 ? (
          <div className="white-card" style={{ padding: '48px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <CreditCard size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>No subscription plans created yet</p>
            <button className="btn-primary" style={{ marginTop: '12px' }} onClick={openCreateModal}>
              <Plus size={18} /> Create Your First Plan
            </button>
          </div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className="white-card" style={{
              padding: '24px',
              border: !plan.isActive ? '2px dashed var(--border-color)' : '2px solid transparent',
              opacity: plan.isActive ? 1 : 0.6,
              position: 'relative'
            }}>
              {!plan.isActive && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  Inactive
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{plan.name}</h3>
                  {plan.description && (
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{plan.description}</p>
                  )}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>
                  ₹{plan.price}
                  <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-light)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <Package size={14} style={{ color: 'var(--accent)' }} />
                  <span>{plan.productLimit === 999999 ? 'Unlimited' : `${plan.productLimit}`} Products</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-light)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <IndianRupee size={14} style={{ color: 'var(--accent)' }} />
                  <span>₹{plan.price}/month</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn-outline" style={{ flex: 1, padding: '8px', fontSize: '13px' }} onClick={() => openEditModal(plan)}>
                  <Edit size={14} /> Edit
                </button>
                <button className="btn-outline" style={{ flex: 1, padding: '8px', fontSize: '13px' }} onClick={() => handleToggle(plan)}>
                  {plan.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />}
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn-outline" style={{ flex: 1, padding: '8px', fontSize: '13px', color: '#ef4444' }} onClick={() => handleDelete(plan)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Plan' : 'Create Subscription Plan'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                {error && (
                  <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} /> {error}
                  </div>
                )}

                <div className="input-group">
                  <label>Plan Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Basic, Premium, Enterprise"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what's included in this plan"
                    rows={3}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="999"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Duration (days)</label>
                    <input
                      type="number"
                      value={formData.durationDays}
                      onChange={e => setFormData({ ...formData, durationDays: e.target.value })}
                      placeholder="30"
                      min="1"
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Sort Order</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={e => setFormData({ ...formData, sortOrder: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Product Limit</label>
                  <input
                    type="number"
                    value={formData.productLimit}
                    onChange={e => setFormData({ ...formData, productLimit: e.target.value })}
                    placeholder="50"
                    min="1"
                  />
                  <p className="input-help">Maximum number of products the tenant can create. Use 999999 for unlimited.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  {editingId ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
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