import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Type } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '' });
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

    const handlePageChange = (newPage) => {
        fetchCategories(newPage);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.CATEGORIES}/${formData.id}` : API_ENDPOINTS.CATEGORIES;
        const method = formData.id ? 'PUT' : 'POST';

        const body = { name: formData.name };
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

    const handleDelete = async (id) => {
        if (confirm('Delete this category?')) {
            await fetch(`${API_ENDPOINTS.CATEGORIES}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchCategories();
        }
    };

    return (
        <>
            <header className="top-header">
                <h1>Categories</h1>
            </header>
            <div className="content-view active">
                <div className="action-bar">
                    <button className="btn-primary" onClick={() => { setFormData({ id: null, name: '' }); setModalOpen(true); }}><Plus size={18} /> Add Category</button>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    <td>#{cat.id}</td>
                                    <td>{cat.name}</td>
                                    <td>
                                        <button className="action-btn edit" onClick={() => { setFormData({ id: cat.id, name: cat.name }); setModalOpen(true); }}><Edit2 size={16} /> Edit</button>
                                        <button className="action-btn delete" onClick={() => handleDelete(cat.id)}><Trash2 size={16} /> Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <h3>{formData.id ? 'Edit Category' : 'Add Category'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group has-icon">
                                <label>Name</label>
                                <div className="input-wrapper">
                                    <Type className="input-icon" size={18} />
                                    <input type="text" placeholder="Enter category name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
