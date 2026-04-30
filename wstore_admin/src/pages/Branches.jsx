import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Shield, User, Lock, Store } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Branches() {
    const [branches, setBranches] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', username: '', password: '' });
    const location = useLocation();

    const fetchBranches = async () => {
        const res = await fetch(API_ENDPOINTS.BRANCHES, {
            headers: getHeaders()
        });
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('add') === 'true') {
            setModalOpen(true);
        }
    }, [location.search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(API_ENDPOINTS.BRANCHES, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            setModalOpen(false);
            setFormData({ name: '', username: '', password: '' });
            fetchBranches();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will NOT delete sub-data but will orphan them.')) return;
        await fetch(`${API_ENDPOINTS.BRANCHES}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        fetchBranches();
    };

    return (
        <>
            <header className="top-header">
                <h1>Branch Management</h1>
            </header>

            <div className="content-view active">
                <div className="action-bar">
                    <button className="btn-primary" onClick={() => setModalOpen(true)}>
                        <Plus size={18} /> Add New Branch
                    </button>
                </div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {branches.map(branch => (
                        <div key={branch.id} className="stat-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="icon-wrapper" style={{ position: 'static', color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', padding: '10px', borderRadius: '10px' }}>
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>{branch.name}</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: #{branch.id}</span>
                                    </div>
                                </div>
                                <button className="action-btn delete" onClick={() => handleDelete(branch.id)}><Trash2 size={16} /></button>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <User size={14} className="text-muted" /> <strong>User:</strong> {branch.username}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Lock size={14} className="text-muted" /> <strong>Pass:</strong> ••••••••
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {branches.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                        <MapPin size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>No branches configured yet.</p>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Shield size={24} className="text-accent" />
                            <h3 style={{ margin: 0 }}>Create New Branch</h3>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Branch Name</label>
                                <input type="text" placeholder="e.g. Downtown Outlet" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label>Username</label>
                                <input type="text" placeholder="Branch login ID" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <input type="password" placeholder="Branch access key" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Provision Branch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
