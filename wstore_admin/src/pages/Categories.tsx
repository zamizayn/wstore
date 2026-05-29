import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Tag } from 'lucide-react';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import PaginationBar from '../components/PaginationBar';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Categories() {
    const [categories, setCategories] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState<{ id: any; name: string }>({ id: null, name: '' });
    const navigate = useNavigate();

    const fetchCategories = async (page = 1) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.CATEGORIES}?page=${page}&limit=10&branchId=${branchId}`, {
            headers: getHeaders()
        });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setCategories(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    useEffect(() => { fetchCategories(); }, []);

    const handlePageChange = (newPage: number) => {
        fetchCategories(newPage);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.CATEGORIES}/${formData.id}` : API_ENDPOINTS.CATEGORIES;
        const method = formData.id ? 'PUT' : 'POST';

        const body: Record<string, any> = { name: formData.name };
        const branchId = localStorage.getItem('selectedBranchId');
        if (!formData.id && branchId) body.branchId = branchId;

        await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        setModalOpen(false);
        fetchCategories();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this category?')) {
            await fetch(`${API_ENDPOINTS.CATEGORIES}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchCategories();
        }
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Product Categories</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Organize your products into easy-to-find groups</p>
                </div>
                <button className="btn-primary" onClick={() => { setFormData({ id: null, name: '' }); setModalOpen(true); }}>
                    <Plus size={18} /> Add Category
                </button>
            </header>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>ID</th>
                            <th>Category Name</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat: any) => (
                            <tr key={cat.id}>
                                <td style={{ fontWeight: 700 }}>#{cat.id}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Tag size={16} />
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{cat.name}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn-outline" style={{ padding: '8px' }} onClick={() => { setFormData({ id: cat.id, name: cat.name }); setModalOpen(true); }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(cat.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {categories.length === 0 && (
                    <EmptyState icon={<Tag size={48} />} title="No categories created yet." />
                )}

                <PaginationBar
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={formData.id ? 'Edit Category' : 'New Category'} maxWidth="400px">
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Category Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Electronics"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="modal-actions" style={{ marginTop: '32px', gap: '12px' }}>
                        <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Category</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
