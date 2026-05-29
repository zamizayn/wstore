import { useEffect, useState } from 'react';
import { Plus, Trash2, Building2, Edit, CheckCircle2, XCircle, Search, Key, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import PaginationBar from '../components/PaginationBar';
import FilterCard from '../components/FilterCard';
import ResetButton from '../components/ResetButton';
import EmptyState from '../components/EmptyState';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Tenants() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 });
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        phoneNumberId: '',
        whatsappToken: '',
        wabaId: '',
        username: '',
        password: '',
        catalogId: '',
        displayMode: 'catalog',
        isActive: true
    });
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

    const fetchStats = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.TENANTS, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                const allTenants = Array.isArray(data) ? data : (data.tenants || []);
                const active = allTenants.filter(t => t.isActive).length;
                setStats({
                    total: allTenants.length,
                    active,
                    disabled: allTenants.length - active
                });
            }
        } catch (e) {
            console.error('Error fetching tenant stats:', e);
        }
    };

    const fetchTenants = async (page = 1) => {
        setLoading(true);
        try {
            let url = `${API_ENDPOINTS.TENANTS}?page=${page}&limit=10`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (statusFilter) url += `&status=${statusFilter}`;

            const res = await fetch(url, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setTenants(data.tenants || []);
                setPagination({
                    page: data.currentPage || 1,
                    totalPages: data.pages || 1
                });
            }
        } catch (e) {
            console.error('Failed to fetch tenants:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchTenants(1);
    }, [search, statusFilter]);

    const handlePageChange = (newPage) => {
        fetchTenants(newPage);
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId ? `${API_ENDPOINTS.TENANTS}/${editingId}` : API_ENDPOINTS.TENANTS;
        const method = editingId ? 'PUT' : 'POST';

        const fData = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== undefined && formData[key] !== null) {
                fData.append(key, formData[key]);
            }
        });
        if (logoFile) {
            fData.append('logo', logoFile);
        }

        const headers = getHeaders();
        delete headers['Content-Type'];

        const res = await fetch(url, {
            method,
            headers,
            body: fData
        });

        if (res.ok) {
            handleCloseModal();
            fetchStats();
            fetchTenants(pagination.page);
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
            displayMode: tenant.displayMode || 'catalog',
            isActive: tenant.isActive
        });
        setLogoPreview(tenant.whatsappSettings?.logo || '');
        setLogoFile(null);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setLogoFile(null);
        setLogoPreview('');
        setFormData({
            name: '',
            phoneNumberId: '',
            whatsappToken: '',
            wabaId: '',
            username: '',
            password: '',
            catalogId: '',
            displayMode: 'catalog',
            isActive: true
        });
    };

    const handleEnableWebhooks = async (id) => {
        if (!confirm('Are you sure you want to enable webhooks for this tenant? This will subscribe the WhatsApp account to your Friska app on Meta.')) return;

        try {
            const res = await fetch(`${API_ENDPOINTS.TENANTS}/${id}/enable-webhooks`, {
                method: 'POST',
                headers: getHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                alert('Webhooks successfully enabled!');
                fetchTenants(pagination.page);
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
        fetchStats();
        fetchTenants(pagination.page);
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Platform Tenants</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage business accounts and WhatsApp configurations</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={() => { setEditingId(null); setModalOpen(true); }}>
                        <Plus size={18} /> Add Tenant
                    </button>
                </div>
            </header>

            {/* Statistics Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Businesses</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{stats.total}</h2>
                    </div>
                </div>

                <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#dcfce7', color: '#10b981', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Accounts</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{stats.active}</h2>
                    </div>
                </div>

                <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XCircle size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Disabled Accounts</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{stats.disabled}</h2>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <FilterCard>
                <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Search Business</label>
                    <div className="input-with-icon">
                        <Search size={16} className="field-icon" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Status Filter</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                    </select>
                </div>
                <ResetButton
                    onClick={handleResetFilters}
                    disabled={!(search || statusFilter)}
                />
            </FilterCard>

            {/* Tenants Listing Table */}
            <div className="white-card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        <p>Loading business listings...</p>
                    </div>
                ) : tenants.length === 0 ? (
                    <EmptyState icon={<Building2 size={48} />} title="No tenants found" description="No business matches the current search filters." />
                ) : (
                    <>
                        <table className="modern-table" style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th>Business</th>
                                    <th>Meta Phone ID</th>
                                    <th>WABA ID</th>
                                    <th>Meta Access Token</th>
                                    <th>Mode</th>
                                    <th>Status</th>
                                    <th>Webhooks</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(tenant => (
                                    <tr key={tenant.id} style={{ opacity: tenant.isActive ? 1 : 0.6 }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                {tenant.whatsappSettings?.logo ? (
                                                    <img
                                                        src={tenant.whatsappSettings.logo}
                                                        alt={tenant.name}
                                                        style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                        {tenant.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{tenant.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: #{tenant.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{tenant.phoneNumberId || '—'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{tenant.wabaId || '—'}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                                <Key size={12} />
                                                <span>{tenant.whatsappToken ? '••••••••' : 'Not Configured'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-main)' }}>
                                                {tenant.displayMode || 'catalog'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-pill ${tenant.isActive ? 'success' : 'danger'}`}>
                                                {tenant.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td>
                                            {tenant.isActive && tenant.wabaId ? (
                                                tenant.webhooksEnabled ? (
                                                    <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle2 size={14} /> Subscribed
                                                    </span>
                                                ) : (
                                                    <button
                                                        className="btn-outline"
                                                        style={{ padding: '4px 10px', fontSize: '11px', borderColor: 'var(--success)', color: 'var(--success)', height: 'auto' }}
                                                        onClick={() => handleEnableWebhooks(tenant.id)}
                                                    >
                                                        Enable Webhooks
                                                    </button>
                                                )
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button className="btn-outline" style={{ padding: '8px' }} onClick={() => handleEdit(tenant)} title="Edit">
                                                    <Edit size={14} />
                                                </button>
                                                <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(tenant.id)} title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination Area */}
                        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-color)' }}>
                            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '560px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>{editingId ? 'Edit Tenant Business' : 'Create New Tenant'}</h3>
                            <button className="btn-outline" style={{ padding: '4px', border: 'none' }} onClick={handleCloseModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Business Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Aventus Informatics"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Logo File Selector */}
                            <div className="input-group" style={{ marginBottom: '24px' }}>
                                <label>Business Logo / Display Image (Optional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                    {logoPreview ? (
                                        <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                                            <img src={logoPreview} alt="Preview" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }} />
                                            <button
                                                type="button"
                                                onClick={() => { setLogoFile(null); setLogoPreview(''); }}
                                                style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                            <ImageIcon size={24} />
                                        </div>
                                    )}
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            id="tenant-logo-file"
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    setLogoFile(file);
                                                    setLogoPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                        <label htmlFor="tenant-logo-file" className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer', display: 'inline-block', fontWeight: 600 }}>
                                            Choose Image
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Meta Phone ID</label>
                                    <input type="text" placeholder="e.g. 104847293817392" value={formData.phoneNumberId} onChange={e => setFormData({ ...formData, phoneNumberId: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Meta WABA ID</label>
                                    <input type="text" placeholder="e.g. 293847293817392" value={formData.wabaId} onChange={e => setFormData({ ...formData, wabaId: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Meta Access Token</label>
                                <input type="password" placeholder="Paste Permanent Meta Access Token" value={formData.whatsappToken} onChange={e => setFormData({ ...formData, whatsappToken: e.target.value })} />
                            </div>

                            <div className="input-group">
                                <label>Meta Catalog ID (Optional)</label>
                                <input type="text" placeholder="e.g. 394857293817392" value={formData.catalogId} onChange={e => setFormData({ ...formData, catalogId: e.target.value })} />
                            </div>

                            <div className="input-group">
                                <label>Display Mode (WhatsApp Chatbot)</label>
                                <select 
                                    value={formData.displayMode} 
                                    onChange={e => setFormData({ ...formData, displayMode: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white' }}
                                >
                                    <option value="catalog">Vertical List (Meta Catalog)</option>
                                    <option value="carousel">Horizontal Carousel (Custom Cards)</option>
                                </select>
                            </div>

                            <div style={{ padding: '20px', background: 'var(--accent-light)', borderRadius: '16px', marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '16px' }}>Admin Credentials</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Username</label>
                                        <input type="text" placeholder="admin_username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Password</label>
                                        <input type="password" placeholder={editingId ? 'Leave blank to keep current' : '••••••••'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                                <input type="checkbox" id="tenantActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="tenantActive" style={{ marginBottom: 0, fontWeight: 500 }}>Active and enabled</label>
                            </div>

                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{editingId ? 'Save Changes' : 'Create Tenant'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
