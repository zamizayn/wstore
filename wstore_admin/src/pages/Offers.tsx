import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Tag, IndianRupee, Calendar, Percent, Hash } from 'lucide-react';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Offers() {
    const [offers, setOffers] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({
        id: null,
        code: '',
        description: '',
        discountType: 'flat',
        discountValue: '',
        minOrderValue: 0,
        maxDiscount: '',
        usageType: 'unlimited',
        startDate: '',
        endDate: '',
        usageLimit: '',
        isActive: true
    });
    const navigate = useNavigate();

    const fetchOffers = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId') || '';
        const res = await fetch(`${API_ENDPOINTS.OFFERS}?branchId=${branchId}`, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setOffers(Array.isArray(result) ? result : result.data || []);
    };

    useEffect(() => { fetchOffers(); }, []);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.OFFERS}/${formData.id}` : API_ENDPOINTS.OFFERS;
        const method = formData.id ? 'PUT' : 'POST';

        const body: Record<string, any> = { ...formData };
        const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId');

        if (!formData.id) {
            if (!branchId) {
                alert('Please select a branch first from the top menu.');
                return;
            }
            body.branchId = branchId;
        }

        if (body.maxDiscount === '') delete body.maxDiscount;
        if (body.startDate === '') delete body.startDate;
        if (body.endDate === '') delete body.endDate;
        if (body.usageLimit === '') body.usageLimit = null;

        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'Failed to save offer');
            return;
        }

        setModalOpen(false);
        fetchOffers();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this offer?')) {
            await fetch(`${API_ENDPOINTS.OFFERS}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchOffers();
        }
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Offers & Discounts</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Create and manage promotional offers</p>
                </div>
                <button className="btn-primary" onClick={() => { setFormData({ id: null, code: '', description: '', discountType: 'flat', discountValue: '', minOrderValue: 0, maxDiscount: '', usageType: 'unlimited', startDate: '', endDate: '', usageLimit: '', isActive: true }); setModalOpen(true); }}>
                    <Plus size={18} /> Create Offer
                </button>
            </header>

            <div className="white-card">
                {offers.length === 0 ? (
                    <EmptyState icon={<Tag size={48} />} title="No offers created yet" description="Create your first promotional offer" />
                ) : (
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Discount</th>
                                <th>Type</th>
                                <th>Usage</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {offers.map((offer: any) => (
                                <tr key={offer.id}>
                                    <td style={{ fontWeight: 700 }}>{offer.code}</td>
                                    <td>
                                        {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                                    </td>
                                    <td><span className="badge badge-info">{offer.discountType}</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{offer.usageType}</td>
                                    <td>
                                        {offer.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button className="btn-outline" style={{ padding: '8px' }} onClick={() => { setFormData({ ...offer, id: offer.id }); setModalOpen(true); }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(offer.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={formData.id ? 'Edit Offer' : 'Create Offer'}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="input-group">
                            <label>Offer Code</label>
                            <div className="input-with-icon">
                                <Hash size={18} />
                                <input type="text" placeholder="e.g. SUMMER20" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Discount Type</label>
                            <select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value })}>
                                <option value="flat">Flat (₹)</option>
                                <option value="percentage">Percentage (%)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="input-group">
                            <label>Discount Value {formData.discountType === 'percentage' ? '(%)' : '(₹)'}</label>
                            <div className="input-with-icon">
                                {formData.discountType === 'percentage' ? <Percent size={18} /> : <IndianRupee size={18} />}
                                <input type="number" placeholder="e.g. 20" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: e.target.value })} required />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Min. Order Value (₹)</label>
                            <input type="number" placeholder="0" value={formData.minOrderValue} onChange={e => setFormData({ ...formData, minOrderValue: Number(e.target.value) })} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="input-group">
                            <label>Start Date</label>
                            <div className="input-with-icon">
                                <Calendar size={18} />
                                <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>End Date</label>
                            <div className="input-with-icon">
                                <Calendar size={18} />
                                <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="input-group">
                            <label>Usage Type</label>
                            <select value={formData.usageType} onChange={e => setFormData({ ...formData, usageType: e.target.value })}>
                                <option value="unlimited">Unlimited</option>
                                <option value="limited">Limited</option>
                                <option value="once_per_customer">Once per customer</option>
                            </select>
                        </div>
                        {formData.usageType === 'limited' && (
                            <div className="input-group">
                                <label>Usage Limit</label>
                                <input type="number" placeholder="e.g. 100" value={formData.usageLimit} onChange={e => setFormData({ ...formData, usageLimit: e.target.value })} />
                            </div>
                        )}
                        {formData.discountType === 'percentage' && (
                            <div className="input-group">
                                <label>Max Discount (₹)</label>
                                <input type="number" placeholder="Optional" value={formData.maxDiscount} onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div className="input-group">
                        <label>Description</label>
                        <textarea rows={3} placeholder="Offer description..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                        <span style={{ fontWeight: 600 }}>Active</span>
                    </label>

                    <div className="modal-actions" style={{ gap: '12px' }}>
                        <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{formData.id ? 'Update Offer' : 'Create Offer'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
