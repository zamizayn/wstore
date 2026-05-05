import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Type, IndianRupee, AlignLeft, Image as ImageIcon, ListFilter, Fingerprint } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [categories, setCategories] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', price: '', categoryId: '', description: '', image: '', stock: 50, retailerId: '' });
    const navigate = useNavigate();

    const isAdmin = localStorage.getItem('adminRole') === 'superadmin';

    const fetchProducts = async (page = 1, overrideTenant = selectedTenant) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        let url = `${API_ENDPOINTS.PRODUCTS}?page=${page}&limit=10&branchId=${branchId}`;
        if (isAdmin && overrideTenant) {
            url += `&tenantId=${overrideTenant}`;
        }
        const res = await fetch(url, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setProducts(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    const fetchCategories = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.CATEGORIES}?branchId=${branchId}`, { headers: getHeaders() });
        const data = await res.json();
        setCategories(data.data || data); // Handle both formats
    };

    const fetchTenants = async () => {
        if (!isAdmin) return;
        try {
            const res = await fetch(API_ENDPOINTS.TENANTS, { headers: getHeaders() });
            const data = await res.json();
            setTenants(data.data || data);
        } catch (e) {
            console.error('Error fetching tenants', e);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchTenants();
    }, []);

    const handlePageChange = (newPage) => {
        fetchProducts(newPage);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.PRODUCTS}/${formData.id}` : API_ENDPOINTS.PRODUCTS;
        const method = formData.id ? 'PUT' : 'POST';

        const body = { ...formData };
        const branchId = localStorage.getItem('selectedBranchId');
        if (!formData.id && branchId) body.branchId = branchId;

        await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        setModalOpen(false);
        fetchProducts(pagination.page);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this product?')) {
            await fetch(`${API_ENDPOINTS.PRODUCTS}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchProducts(pagination.page);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setFormData({ ...item });
        } else {
            setFormData({ id: null, name: '', price: '', categoryId: categories[0]?.id || '', description: '', image: '', stock: 50, retailerId: '' });
        }
        setModalOpen(true);
    };

    return (
        <>
            <header className="top-header">
                <h1>Products</h1>
            </header>
            <div className="content-view active">
                <div className="action-bar" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button className="btn-primary" onClick={() => openModal()}><Plus size={18} /> Add Product</button>
                    {isAdmin && (
                        <div className="input-wrapper" style={{ minWidth: '220px', position: 'relative' }}>
                            <select
                                className="input-modern"
                                style={{ paddingLeft: '12px', height: '40px', width: '100%', appearance: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                value={selectedTenant}
                                onChange={(e) => {
                                    setSelectedTenant(e.target.value);
                                    fetchProducts(1, e.target.value);
                                }}
                            >
                                <option value="">All Tenants</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Stock</th>
                                <th>Price</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(prod => (
                                <tr key={prod.id}>
                                    <td><img src={prod.image} alt={prod.name} className="product-img" /></td>
                                    <td>{prod.name}</td>
                                    <td>{prod.category?.name}</td>
                                    <td>
                                        <span className={`badge ${prod.stock < 10 ? 'pending' : 'delivered'}`} style={{ fontSize: '11px' }}>
                                            {prod.stock} left
                                        </span>
                                    </td>
                                    <td>₹{prod.price}</td>
                                    <td>
                                        <button className="action-btn edit" onClick={() => openModal(prod)}><Edit2 size={16} /> Edit</button>
                                        <button className="action-btn delete" onClick={() => handleDelete(prod.id)}><Trash2 size={16} /> Delete</button>
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
                        <h3>{formData.id ? 'Edit Product' : 'Add Product'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group has-icon">
                                <label>Name</label>
                                <div className="input-wrapper">
                                    <Type className="input-icon" size={18} />
                                    <input type="text" placeholder="Product name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Category</label>
                                <div className="input-wrapper">
                                    <ListFilter className="input-icon" size={18} />
                                    <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                                        <option value="" disabled>Select a category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Price</label>
                                <div className="input-wrapper">
                                    <IndianRupee className="input-icon" size={18} />
                                    <input type="number" placeholder="Enter price" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Stock Inventory</label>
                                <input type="number" placeholder="Available units" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} required />
                            </div>
                            <div className="input-group has-icon">
                                <label>Description</label>
                                <div className="input-wrapper">
                                    <AlignLeft className="input-icon align-top" size={18} />
                                    <textarea rows="3" placeholder="Detailed product description..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Image URL</label>
                                <div className="input-wrapper">
                                    <ImageIcon className="input-icon" size={18} />
                                    <input type="url" placeholder="https://..." value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Retailer ID (Meta Content ID)</label>
                                <div className="input-wrapper">
                                    <Fingerprint className="input-icon" size={18} />
                                    <input type="text" placeholder="e.g. oiv7t6taic" value={formData.retailerId} onChange={e => setFormData({ ...formData, retailerId: e.target.value })} />
                                </div>
                                <small style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    Must match the "Content ID" in Meta Commerce Manager
                                </small>
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
