import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Type, IndianRupee, AlignLeft, Image as ImageIcon, ListFilter } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [categories, setCategories] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', price: '', categoryId: '', description: '', image: '', stock: 50 });
    const navigate = useNavigate();

    const fetchProducts = async (page = 1) => {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
        const res = await fetch(`/api/admin/products?page=${page}&limit=10`, { headers });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setProducts(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    const fetchCategories = async () => {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
        const res = await fetch('/api/admin/categories', { headers });
        const data = await res.json();
        setCategories(data.data || data); // Handle both formats
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const handlePageChange = (newPage) => {
        fetchProducts(newPage);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `/api/admin/products/${formData.id}` : '/api/admin/products';
        const method = formData.id ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        setModalOpen(false);
        fetchProducts(pagination.page);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this product?')) {
            await fetch(`/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            fetchProducts(pagination.page);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setFormData({ ...item });
        } else {
            setFormData({ id: null, name: '', price: '', categoryId: categories[0]?.id || '', description: '', image: '', stock: 50 });
        }
        setModalOpen(true);
    };

    return (
        <>
            <header className="top-header">
                <h1>Products</h1>
            </header>
            <div className="content-view active">
                <div className="action-bar">
                    <button className="btn-primary" onClick={() => openModal()}><Plus size={18} /> Add Product</button>
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
