import { useEffect, useState } from 'react';
import { Plus, Trash2, Building2, Globe, Key, Phone, Settings2, Edit, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Tenants() {
    const [tenants, setTenants] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phoneNumberId: '',
        whatsappToken: '',
        wabaId: '',
        username: '',
        password: '',
        catalogId: '',
        isActive: true
    });
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

    const fetchTenants = async () => {
        const res = await fetch(API_ENDPOINTS.TENANTS, {
            headers: getHeaders()
        });
        const data = await res.json();
        setTenants(data);
    };

    useEffect(() => { fetchTenants(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId ? `${API_ENDPOINTS.TENANTS}/${editingId}` : API_ENDPOINTS.TENANTS;
        const method = editingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            setModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', phoneNumberId: '', whatsappToken: '', wabaId: '', username: '', password: '', catalogId: '', isActive: true });
            fetchTenants();
        }
    };

    const handleEdit = (tenant) => {
        setEditingId(tenant.id);
        setFormData({
            name: tenant.name,
            phoneNumberId: tenant.phoneNumberId || '',
            whatsappToken: tenant.whatsappToken || '',
            wabaId: tenant.wabaId || '',
            username: tenant.username || '',
            password: '', // Don't pre-fill password for security
            catalogId: tenant.catalogId || '',
            isActive: tenant.isActive
        });
        setModalOpen(true);
    };

    const handleEnableWebhooks = async (id) => {
        if (!confirm('Are you sure you want to enable webhooks for this tenant? This will subscribe the WhatsApp account to your WStore app on Meta.')) return;

        try {
            const res = await fetch(`${API_ENDPOINTS.TENANTS}/${id}/enable-webhooks`, {
                method: 'POST',
                headers: getHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                alert('Webhooks successfully enabled!');
                fetchTenants();
            } else {
                alert('Error: ' + (data.error || 'Failed to enable webhooks'));
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this tenant? This will effectively disable all associated branches.')) return;
        await fetch(`${API_ENDPOINTS.TENANTS}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        fetchTenants();
    };

    return (
        <>
            <header className="top-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1>Platform Tenants</h1>
                    <span className="badge">{tenants.length} Businesses</span>
                </div>
            </header>

            <div className="content-view active">
                <div className="action-bar">
                    <button className="btn-primary" onClick={() => { setEditingId(null); setModalOpen(true); }}>
                        <Plus size={18} /> Onboard New Tenant
                    </button>
                    <button className="btn-outline" onClick={() => navigate('/onboard-wizard')}>
                        <Settings2 size={18} /> Launch Wizard
                    </button>
                </div>

                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                    {tenants.map(tenant => (
                        <div key={tenant.id} className={`stat-card ${!tenant.isActive ? 'inactive' : ''}`} style={{ padding: '24px', opacity: tenant.isActive ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="icon-wrapper" style={{ color: 'var(--accent)', background: 'var(--accent-light)', padding: '12px', borderRadius: '12px' }}>
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px' }}>{tenant.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '2px' }}>
                                            {tenant.isActive ? <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> : <XCircle size={12} style={{ color: 'var(--danger)' }} />}
                                            <span style={{ color: 'var(--text-muted)' }}>{tenant.isActive ? 'Active' : 'Disabled'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="action-btn" onClick={() => handleEdit(tenant)}><Edit size={16} /></button>
                                    <button className="action-btn delete" onClick={() => handleDelete(tenant.id)}><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="tenant-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="meta-item" style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone Number ID</div>
                                    <div style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Phone size={14} className="text-muted" /> {tenant.phoneNumberId || 'Not set'}
                                    </div>
                                </div>
                                <div className="meta-item" style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>WABA ID</div>
                                    <div style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Settings2 size={14} className="text-muted" /> {tenant.wabaId || 'Not set'}
                                    </div>
                                </div>
                                <div className="meta-item" style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Meta Catalog ID</div>
                                    <div style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Settings2 size={14} className="text-muted" /> {tenant.catalogId || 'Not set'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Access Token</div>
                                <div style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Key size={14} className="text-muted" />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {tenant.whatsappToken ? '••••••••••••••••' : 'Missing Configuration'}
                                    </span>
                                </div>
                            </div>

                            {!tenant.webhooksEnabled && tenant.isActive && tenant.wabaId && (
                                <div style={{ marginTop: '20px' }}>
                                    <button
                                        className="btn-primary w-full"
                                        style={{ background: 'var(--success)', boxShadow: 'none', fontSize: '13px', padding: '10px' }}
                                        onClick={() => handleEnableWebhooks(tenant.id)}
                                    >
                                        <Globe size={16} /> Enable Meta Webhooks
                                    </button>
                                </div>
                            )}
                            {tenant.webhooksEnabled && (
                                <div style={{ marginTop: '20px', textAlign: 'center', color: 'var(--success)', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <CheckCircle2 size={16} /> Webhooks Active
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {tenants.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                        <Building2 size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                        <h2>No tenants onboarded</h2>
                        <p>Get started by adding your first business tenant.</p>
                        <button className="btn-primary" style={{ marginTop: '20px', width: 'auto', display: 'inline-block' }} onClick={() => setModalOpen(true)}>Add Tenant Now</button>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: 'var(--accent-light)', padding: '10px', borderRadius: '12px' }}>
                                <Globe size={24} className="text-accent" />
                            </div>
                            <h3 style={{ margin: 0 }}>{editingId ? 'Update Tenant' : 'Onboard New Tenant'}</h3>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Business Name</label>
                                <input type="text" placeholder="e.g. Acme Corporation" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Meta Phone ID</label>
                                    <input type="text" placeholder="109283..." value={formData.phoneNumberId} onChange={e => setFormData({ ...formData, phoneNumberId: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Meta WABA ID</label>
                                    <input type="text" placeholder="WABA_..." value={formData.wabaId} onChange={e => setFormData({ ...formData, wabaId: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Meta Access Token</label>
                                <input type="password" placeholder="System User Access Token" value={formData.whatsappToken} onChange={e => setFormData({ ...formData, whatsappToken: e.target.value })} />
                            </div>

                            <div className="input-group">
                                <label>Meta Catalog ID</label>
                                <input type="text" placeholder="Optional: To enable Native Commerce" value={formData.catalogId} onChange={e => setFormData({ ...formData, catalogId: e.target.value })} />
                            </div>

                            <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--accent)' }}>Tenant Admin Account</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Username</label>
                                        <input type="text" placeholder="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Password</label>
                                        <input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', marginBottom: '20px' }}>
                                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                                <label style={{ marginBottom: 0 }}>Tenant is active and allowed to use services</label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Tenant'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
