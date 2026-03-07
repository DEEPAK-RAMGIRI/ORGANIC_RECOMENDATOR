import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FlaskConical, Stethoscope, Library, Tractor } from 'lucide-react';
import '../styles/sidebar.css';

export default function Sidebar() {
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Start Triage', path: '/triage', icon: <Stethoscope size={20} /> },
        { name: 'My Plans', path: '/my-plans', icon: <Library size={20} /> },
        { name: 'Farm Portfolio', path: '/farms', icon: <Tractor size={20} /> },
    ];

    return (
        <aside className="global-sidebar">
            <div className="sidebar-header">
                <FlaskConical size={28} color="#2ecc71" />
                <h2>Organic Buddy</h2>
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
