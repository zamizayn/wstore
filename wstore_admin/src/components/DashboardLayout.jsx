import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Tags, ShoppingBag, ShoppingCart, Users, LogOut, Hexagon, MapPin } from 'lucide-react';

export default function DashboardLayout() {
    const navigate = useNavigate();

    const role = localStorage.getItem('adminRole');

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('branchId');
        localStorage.removeItem('branchName');
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            <nav className="side-nav">
                <div className="nav-brand">
                    <Hexagon className="brand-icon" size={28} />
                    <h2>WStore</h2>
                    <span className="badge">Admin</span>
                </div>
                <ul className="nav-menu">
                    <li><NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}><LayoutDashboard size={18}/> <span>Dashboard</span></NavLink></li>
                    {role === 'superadmin' && (
                        <li><NavLink to="/branches" className={({ isActive }) => isActive ? 'active' : ''}><MapPin size={18}/> <span>Branches</span></NavLink></li>
                    )}
                    <li><NavLink to="/categories" className={({ isActive }) => isActive ? 'active' : ''}><Tags size={18}/> <span>Categories</span></NavLink></li>
                    <li><NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}><ShoppingBag size={18}/> <span>Products</span></NavLink></li>
                    <li><NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}><ShoppingCart size={18}/> <span>Orders</span></NavLink></li>
                    <li><NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}><Users size={18}/> <span>Customers</span></NavLink></li>
                </ul>
                <div className="nav-footer">
                    <button onClick={handleLogout} className="btn-outline w-full"><LogOut size={18}/> <span>Logout</span></button>
                </div>
            </nav>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
