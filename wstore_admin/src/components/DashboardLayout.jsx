import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Tags, ShoppingBag, ShoppingCart, Users, LogOut, Hexagon, MapPin, Building2, ChevronDown } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(localStorage.getItem('selectedBranchId') || '');
    const [isHubOpen, setIsHubOpen] = useState(false);

    const role = localStorage.getItem('adminRole');

    useEffect(() => {
        if (role === 'tenant') {
            fetch(API_ENDPOINTS.BRANCHES, { headers: getHeaders() })
                .then(res => res.json())
                .then(data => setBranches(data))
                .catch(err => console.error(err));
        }
    }, [role]);

    const handleBranchChange = (e) => {
        const id = e.target.value;
        setSelectedBranchId(id);
        localStorage.setItem('selectedBranchId', id);
        window.location.reload(); // Simple reload to refresh all data globally
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('branchId');
        localStorage.removeItem('branchName');
        localStorage.removeItem('selectedBranchId');
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            <nav className="side-nav">
                <div className="nav-brand">
                    <Hexagon className="brand-icon" size={28} />
                    <h2>{localStorage.getItem('tenantName') || 'WStore'}</h2>
                    <span className="badge">{role === 'superadmin' ? 'Super' : role}</span>
                </div>

                {role === 'tenant' && branches.length > 0 && (
                    <div className="hub-selector-container">
                        <div className="hub-label">
                            <MapPin size={12} /> Active Hub
                        </div>
                        <div className="hub-selector-wrapper">
                            <button
                                className={`hub-selector-trigger ${isHubOpen ? 'active' : ''}`}
                                onClick={() => setIsHubOpen(!isHubOpen)}
                            >
                                <div className="hub-trigger-content">
                                    <Building2 size={16} />
                                    <span>{branches.find(b => b.id === selectedBranchId)?.name || 'All Branches'}</span>
                                </div>
                                <ChevronDown size={14} className={`chevron-icon ${isHubOpen ? 'rotated' : ''}`} />
                            </button>

                            {isHubOpen && (
                                <>
                                    <div className="hub-menu-overlay" onClick={() => setIsHubOpen(false)}></div>
                                    <div className="hub-options-menu animate-slide-down">
                                        <div
                                            className={`hub-option ${!selectedBranchId ? 'current' : ''}`}
                                            onClick={() => {
                                                handleBranchChange({ target: { value: '' } });
                                                setIsHubOpen(false);
                                            }}
                                        >
                                            <div className="option-dot"></div>
                                            <span>All Branches</span>
                                        </div>
                                        <div className="menu-divider"></div>
                                        {branches.map(b => (
                                            <div
                                                key={b.id}
                                                className={`hub-option ${selectedBranchId === b.id ? 'current' : ''}`}
                                                onClick={() => {
                                                    handleBranchChange({ target: { value: b.id } });
                                                    setIsHubOpen(false);
                                                }}
                                            >
                                                <div className="option-dot"></div>
                                                <span>{b.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <ul className="nav-menu">
                    <li><NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}><LayoutDashboard size={18} /> <span>Dashboard</span></NavLink></li>
                    {role === 'superadmin' && (
                        <li><NavLink to="/admin/tenants" className={({ isActive }) => isActive ? 'active' : ''}><Building2 size={18} /> <span>Tenants</span></NavLink></li>
                    )}
                    <li><NavLink to="/admin/branches" className={({ isActive }) => isActive ? 'active' : ''}><MapPin size={18} /> <span>Branches</span></NavLink></li>
                    <li><NavLink to="/admin/categories" className={({ isActive }) => isActive ? 'active' : ''}><Tags size={18} /> <span>Categories</span></NavLink></li>
                    <li><NavLink to="/admin/products" className={({ isActive }) => isActive ? 'active' : ''}><ShoppingBag size={18} /> <span>Products</span></NavLink></li>
                    <li><NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'active' : ''}><ShoppingCart size={18} /> <span>Orders</span></NavLink></li>
                    <li><NavLink to="/admin/customers" className={({ isActive }) => isActive ? 'active' : ''}><Users size={18} /> <span>Customers</span></NavLink></li>
                </ul>
                <div className="nav-footer">
                    <button onClick={handleLogout} className="btn-outline w-full"><LogOut size={18} /> <span>Logout</span></button>
                </div>
            </nav>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
