import { useEffect, useState } from 'react';
import { Save, ShieldCheck, Globe, Key, AlertCircle, Sparkles, Phone, Info, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Upload, Trash2, Image } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Settings() {
    const [formData, setFormData] = useState({
        razorpayKeyId: '',
        razorpayKeySecret: '',
        razorpayWebhookSecret: '',
        googleMapsApiKey: '',
        geminiApiKey: '',
        storePhone: '',
        wabaId: '',
        phoneNumberId: '',
        whatsappToken: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [copiedField, setCopiedField] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getWebhookUrl = () => {
        let host = window.location.host;
        if (host.includes('localhost:5173') || host.includes('127.0.0.1:5173')) {
            host = host.replace('5173', '3000');
        }
        return `${window.location.protocol}//${host}/webhook`;
    };

    const tenantId = localStorage.getItem('tenantId');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_ENDPOINTS.TENANTS}/me/settings`, {
                    headers: getHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        razorpayKeyId: data.razorpayKeyId || '',
                        razorpayKeySecret: data.razorpayKeySecret || '',
                        razorpayWebhookSecret: data.razorpayWebhookSecret || '',
                        googleMapsApiKey: data.googleMapsApiKey || '',
                        geminiApiKey: data.geminiApiKey || '',
                        storePhone: data.storePhone || '',
                        wabaId: data.wabaId || '',
                        phoneNumberId: data.phoneNumberId || '',
                        whatsappToken: data.whatsappToken || ''
                    });
                    if (data.logo) {
                        setLogoPreview(data.logo);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch settings:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const fData = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== undefined && formData[key] !== null) {
                    fData.append(key, formData[key]);
                }
            });
            if (logoFile) {
                fData.append('logo', logoFile);
            }
            const headers = { ...getHeaders() };
            delete headers['Content-Type'];

            const res = await fetch(`${API_ENDPOINTS.TENANTS}/me/settings`, {
                method: 'PUT',
                headers,
                body: fData
            });
            const resData = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings updated successfully! ✨' });
                if (resData.logo) {
                    setLogoPreview(resData.logo);
                    setLogoFile(null);
                    localStorage.setItem('tenantLogo', resData.logo);
                    window.dispatchEvent(new CustomEvent('tenantLogoUpdated', { detail: { logo: resData.logo } }));
                }
            } else {
                setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div className="spinner"></div>
            </div>
        );
    }



    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Store Settings</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Configure your store's global integrations and preferences</p>
                </div>
            </header>

            <div style={{ maxWidth: '800px' }}>
                {message && (
                    <div style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: message.type === 'success' ? '#059669' : '#dc2626',
                        border: `1px solid ${message.type === 'success' ? '#10b981' : '#f87171'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        fontWeight: 600
                    }}>
                        {message.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>


                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Image size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>Business Profile Image</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Configure your public business logo or display image</p>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            padding: '20px',
                            background: 'var(--bg-app)',
                            borderRadius: '16px',
                            border: '1px dashed var(--border-color)'
                        }}>
                            {logoPreview ? (
                                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                                    <img
                                        src={logoPreview}
                                        alt="Business Logo"
                                        style={{ width: '80px', height: '80px', borderRadius: '14px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLogoFile(null);
                                            setLogoPreview('');
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            right: '-6px',
                                            background: '#ef4444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '14px',
                                    background: 'var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)'
                                }}>
                                    <Upload size={28} />
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="settings-logo-upload"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setLogoFile(file);
                                            setLogoPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="settings-logo-upload"
                                    style={{
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--border-color)',
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        color: 'var(--text-color)',
                                        fontSize: '13.5px',
                                        cursor: 'pointer',
                                        display: 'inline-block',
                                        fontWeight: 600,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    {logoPreview ? 'Change Image' : 'Select Image'}
                                </label>
                                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>This image is used on your public store catalog. PNG, JPG, JPEG, WEBP are supported.</p>
                            </div>
                        </div>
                    </div>


                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Globe size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>Google Maps Integration</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Configure your maps API key for location services</p>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={14} /> Google Maps API Key
                            </label>
                            <input
                                type="text"
                                placeholder="AIzaSy..."
                                value={formData.googleMapsApiKey}
                                onChange={e => setFormData({ ...formData, googleMapsApiKey: e.target.value })}
                                style={{ background: 'var(--bg-app)' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>This key is used for customer address selection and delivery distance calculations.</p>
                        </div>
                    </div>

                    <div className="wizard-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <style>{`
                            .wizard-card {
                                background: #ffffff;
                                border-radius: 24px;
                                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01);
                                border: 1px solid #e2e8f0;
                                position: relative;
                                overflow: hidden;
                            }
                            .wizard-card::before {
                                content: '';
                                position: absolute;
                                top: 0; left: 0; right: 0;
                                height: 5px;
                                background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #25d366 100%);
                            }
                            .wizard-stepper-container {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                position: relative;
                                margin-bottom: 40px;
                                padding: 0 12px;
                            }
                            .wizard-stepper-line {
                                position: absolute;
                                top: 18px;
                                left: 32px;
                                right: 32px;
                                height: 3px;
                                background: #f1f5f9;
                                z-index: 1;
                                border-radius: 2px;
                            }
                            .wizard-stepper-line-active {
                                position: absolute;
                                top: 18px;
                                left: 32px;
                                height: 3px;
                                background: linear-gradient(90deg, #6366f1, #a855f7);
                                z-index: 2;
                                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                                border-radius: 2px;
                            }
                            .wizard-step-node {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                position: relative;
                                z-index: 3;
                                cursor: pointer;
                                width: 56px;
                            }
                            .wizard-step-circle {
                                width: 36px;
                                height: 36px;
                                border-radius: 50%;
                                background: #ffffff;
                                border: 3px solid #e2e8f0;
                                color: #94a3b8;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: 700;
                                font-size: 13px;
                                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                            }
                            .wizard-step-node.active .wizard-step-circle {
                                border-color: #6366f1;
                                color: #6366f1;
                                background: #ffffff;
                                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12), 0 4px 12px rgba(99, 102, 241, 0.15);
                                transform: scale(1.1);
                            }
                            .wizard-step-node.completed .wizard-step-circle {
                                border-color: #10b981;
                                color: #ffffff;
                                background: #10b981;
                                box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);
                            }
                            .wizard-step-circle-label {
                                margin-top: 8px;
                                font-size: 9px;
                                font-weight: 600;
                                color: #94a3b8;
                                text-align: center;
                                white-space: nowrap;
                                transition: color 0.3s ease;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            .wizard-step-node.active .wizard-step-circle-label {
                                color: #6366f1;
                                font-weight: 700;
                            }
                            .wizard-step-node.completed .wizard-step-circle-label {
                                color: #10b981;
                            }
                            @keyframes slideUpFade {
                                from { opacity: 0; transform: translateY(12px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                            .wizard-step-body {
                                animation: slideUpFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                            }
                            .meta-step-card {
                                display: flex;
                                gap: 16px;
                                background: #f8fafc;
                                padding: 18px;
                                border-radius: 16px;
                                border: 1px solid #e2e8f0;
                                transition: all 0.2s ease;
                            }
                            .meta-step-card:hover {
                                transform: translateY(-2px);
                                border-color: #cbd5e1;
                                box-shadow: 0 6px 16px rgba(0,0,0,0.04);
                                background: #ffffff;
                            }
                            .meta-step-card .number-badge {
                                width: 28px;
                                height: 28px;
                                background: #eff6ff;
                                color: #3b82f6;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: 700;
                                font-size: 13px;
                                flex-shrink: 0;
                            }
                            .wizard-guide-box {
                                background: #f8fafc;
                                padding: 20px;
                                border-radius: 16px;
                                border: 1px solid #e2e8f0;
                                margin-top: 20px;
                            }
                            .wizard-guide-box.blue {
                                background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
                                border-color: #cbd5e1;
                            }
                            .wizard-input-wrapper {
                                position: relative;
                                margin-top: 10px;
                            }
                            .wizard-input {
                                width: 100%;
                                padding: 14px 16px 14px 44px !important;
                                border-radius: 12px !important;
                                border: 2.5px solid #f1f5f9 !important;
                                background: #f8fafc !important;
                                font-size: 14px !important;
                                color: #1e293b !important;
                                font-family: inherit !important;
                                transition: all 0.2s ease !important;
                            }
                            .wizard-input:focus {
                                border-color: #8b5cf6 !important;
                                background: #ffffff !important;
                                box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1) !important;
                                outline: none !important;
                            }
                            .wizard-input-icon {
                                position: absolute;
                                left: 16px;
                                top: 50%;
                                transform: translateY(-50%);
                                color: #94a3b8;
                                pointer-events: none;
                                transition: color 0.2s ease;
                            }
                            .wizard-input:focus + .wizard-input-icon {
                                color: #8b5cf6;
                            }
                            .verify-item-row {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 14px 20px;
                                background: #f8fafc;
                                border-radius: 12px;
                                border: 1px solid #e2e8f0;
                                transition: all 0.2s ease;
                            }
                            .verify-item-row:hover {
                                background: #ffffff;
                                border-color: #cbd5e1;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                            }
                            .step-header-title {
                                font-size: 16px;
                                font-weight: 700;
                                color: #1e293b;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                margin-bottom: 8px;
                            }
                        `}</style>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #8b5cf6 0%, #25d366 100%)', color: '#ffffff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(139, 92, 246, 0.2)' }}>
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>WhatsApp & AI Integration Wizard</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Configure your automated customer-reply WhatsApp shop bot in 8 guided steps</p>
                            </div>
                        </div>

                        {/* Stepper Node Progress */}
                        <div className="wizard-stepper-container">
                            <div className="wizard-stepper-line"></div>
                            <div className="wizard-stepper-line-active" style={{ width: `${((currentStep - 1) / 7) * 100}%` }}></div>

                            {[
                                { num: 1, label: 'App' },
                                { num: 2, label: 'WABA' },
                                { num: 3, label: 'Phone ID' },
                                { num: 4, label: 'Token' },
                                { num: 5, label: 'Phone' },
                                { num: 6, label: 'AI Key' },
                                { num: 7, label: 'Webhooks' },
                                { num: 8, label: 'Verify' }
                            ].map(step => (
                                <div
                                    key={step.num}
                                    className={`wizard-step-node ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
                                    onClick={() => setCurrentStep(step.num)}
                                >
                                    <div className="wizard-step-circle">
                                        {currentStep > step.num ? <Check size={16} strokeWidth={3} /> : step.num}
                                    </div>
                                    <span className="wizard-step-circle-label">{step.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Step Contents */}
                        <div className="wizard-step-body" key={currentStep}>
                            {currentStep === 1 && (
                                <div>
                                    <h4 className="step-header-title">
                                        <Globe size={20} style={{ color: '#3b82f6' }} /> Step 1: Create Meta Developer App
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6' }}>
                                        To set up your shop bot, you must create a Meta Developer App. Please open the Meta Portal and complete these steps:
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="meta-step-card">
                                            <div className="number-badge">1</div>
                                            <div>
                                                <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Start App Creation</h5>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                                    Go to the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}>Meta Developer Console</a>, click on <strong>My Apps</strong> in the top header, and click the <strong>Create App</strong> button.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="meta-step-card">
                                            <div className="number-badge">2</div>
                                            <div>
                                                <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>App details (Tab 1)</h5>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                                    Enter your <strong>App name</strong> (e.g. <i>My Shop Bot</i>) and enter your active <strong>App contact email</strong> address. Then click <strong>Next</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="meta-step-card">
                                            <div className="number-badge">3</div>
                                            <div>
                                                <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Use cases (Tab 2)</h5>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                                    Select the checkboxes for <strong>Connect with customers through WhatsApp</strong> and <strong>Manage Products with Catalog API</strong>, then click <strong>Next</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="meta-step-card">
                                            <div className="number-badge">4</div>
                                            <div>
                                                <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Business (Tab 3)</h5>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                                    Choose your verified <strong>Business Portfolio</strong> (e.g. <i>Friska</i>, <i>Wstore</i>). If you do not have one yet, click <strong>Create a business portfolio</strong> to set one up. Click <strong>Next</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="meta-step-card">
                                            <div className="number-badge">5</div>
                                            <div>
                                                <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Requirements & Overview (Tabs 4 & 5)</h5>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                                    Agree to developer requirements, <strong>verify all details entered</strong> on the overview screen, and click <strong>Create app</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="meta-step-card">
                                            <div className="number-badge">6</div>
                                            <div>
                                                <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Set up WhatsApp Product</h5>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                                    On your newly created app dashboard, scroll down to the "Add products to your app" section, locate <strong>WhatsApp</strong>, and click <strong>Set up</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                                        <a
                                            href="https://developers.facebook.com/"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-primary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', textDecoration: 'none', borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 20px rgba(99, 102, 241, 0.15)' }}
                                        >
                                            Open Meta Developer Portal <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <h4 className="step-header-title">
                                        <Key size={20} style={{ color: '#8b5cf6' }} /> Step 2: WhatsApp Business Account (WABA) ID
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }}>
                                        The <strong>WABA ID</strong> connects this online store to your Meta business account.
                                    </p>
                                    <div className="wizard-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Enter WABA ID (e.g., 102938475610293)"
                                            value={formData.wabaId}
                                            onChange={e => setFormData({ ...formData, wabaId: e.target.value })}
                                            className="wizard-input"
                                        />
                                        <Key size={18} className="wizard-input-icon" />
                                    </div>
                                    <div className="wizard-guide-box">
                                        <h5 style={{ color: '#1e293b' }}><Info size={16} style={{ color: '#3b82f6' }} /> How to find your WABA ID:</h5>
                                        <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                            <li>Open the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}>Meta Developer Console</a> and click on your App.</li>
                                            <li>Under the left sidebar menu, click on <strong>WhatsApp</strong>, then click <strong>API Setup</strong>.</li>
                                            <li>Look under the <strong>"Send and receive messages"</strong> section in the main panel.</li>
                                            <li>Find the label <strong>WhatsApp Business Account ID</strong> and copy the long number.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <h4 className="step-header-title">
                                        <Key size={20} style={{ color: '#8b5cf6' }} /> Step 3: Phone Number ID
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }}>
                                        The secret ID that Meta assigns to your registered phone number so we can automate chat messages.
                                    </p>
                                    <div className="wizard-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Enter Phone Number ID (e.g., 109283746510)"
                                            value={formData.phoneNumberId}
                                            onChange={e => setFormData({ ...formData, phoneNumberId: e.target.value })}
                                            className="wizard-input"
                                        />
                                        <Key size={18} className="wizard-input-icon" />
                                    </div>
                                    <div className="wizard-guide-box">
                                        <h5 style={{ color: '#1e293b' }}><Info size={16} style={{ color: '#3b82f6' }} /> How to find your Phone Number ID:</h5>
                                        <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                            <li>Go back to the same <strong>API Setup</strong> page in the Meta Developer Console.</li>
                                            <li>Look at the middle panel under the sending section.</li>
                                            <li>Locate the <strong>Phone number ID</strong> field and copy the long number next to it.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <h4 className="step-header-title">
                                        <Key size={20} style={{ color: '#8b5cf6' }} /> Step 4: Meta Permanent Access Token
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }}>
                                        Acts as a secure, permanent password allowing our bot to authenticate and chat with your customers.
                                    </p>
                                    <div className="wizard-input-wrapper">
                                        <input
                                            type="password"
                                            placeholder="Enter Permanent Access Token (starts with EAA...)"
                                            value={formData.whatsappToken}
                                            onChange={e => setFormData({ ...formData, whatsappToken: e.target.value })}
                                            className="wizard-input"
                                        />
                                        <Key size={18} className="wizard-input-icon" />
                                    </div>
                                    <div className="wizard-guide-box">
                                        <h5 style={{ color: '#1e293b' }}><Info size={16} style={{ color: '#3b82f6' }} /> How to generate a permanent token:</h5>
                                        <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                            <li>Open the <a href="https://business.facebook.com/settings/" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}>Meta Business Suite Settings</a>.</li>
                                            <li>Click <strong>Users</strong> in the sidebar, and select <strong>System Users</strong>.</li>
                                            <li>Click <strong>Add</strong> to create a new user. Set role to <strong>Admin</strong>.</li>
                                            <li>Select this system user and click <strong>Generate New Token</strong>. Select your App.</li>
                                            <li>Select scopes: <strong>whatsapp_business_messaging</strong> and <strong>whatsapp_business_management</strong>.</li>
                                            <li>Click <strong>Generate Token</strong> and copy it immediately.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <h4 className="step-header-title">
                                        <Phone size={20} style={{ color: '#25d366' }} /> Step 5: Store WhatsApp Phone Number
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }}>
                                        The public phone number your customers will send messages to.
                                    </p>
                                    <div className="wizard-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Enter phone number with country code (e.g., 917012738756)"
                                            value={formData.storePhone}
                                            onChange={e => setFormData({ ...formData, storePhone: e.target.value })}
                                            className="wizard-input"
                                        />
                                        <Phone size={18} className="wizard-input-icon" />
                                    </div>
                                    <div className="wizard-guide-box">
                                        <h5 style={{ color: '#1e293b' }}><Info size={16} style={{ color: '#3b82f6' }} /> Format Rules:</h5>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                            Write the phone number with your country code first (e.g. <code>91</code> for India, <code>1</code> for USA). Do NOT add <code>+</code> signs, spaces, or dashes.
                                            <br /><strong style={{ color: '#1e293b' }}>Correct:</strong> <code>917012738756</code> &nbsp;|&nbsp; <strong style={{ color: '#ef4444' }}>Incorrect:</strong> <code>+91 7012-738756</code>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {currentStep === 6 && (
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <h4 className="step-header-title">
                                        <Sparkles size={20} style={{ color: '#a855f7' }} /> Step 6: Gemini AI API Key (Optional)
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }}>
                                        Enables the Google Gemini assistant to answer custom support chats using catalog intelligence.
                                    </p>
                                    <div className="wizard-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Enter Gemini API key (starts with AIzaSy...)"
                                            value={formData.geminiApiKey}
                                            onChange={e => setFormData({ ...formData, geminiApiKey: e.target.value })}
                                            className="wizard-input"
                                        />
                                        <Sparkles size={18} className="wizard-input-icon" />
                                    </div>
                                    <div className="wizard-guide-box">
                                        <h5 style={{ color: '#1e293b' }}><Info size={16} style={{ color: '#3b82f6' }} /> How to get a free API Key:</h5>
                                        <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                            <li>Visit <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}>Google AI Studio</a>.</li>
                                            <li>Click the prominent <strong>Get API Key</strong> button in the top left.</li>
                                            <li>Click <strong>Create API Key</strong>, select a project, and copy the generated key.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {currentStep === 7 && (
                                <div>
                                    <h4 className="step-header-title">
                                        <Info size={20} style={{ color: '#3b82f6' }} /> Step 7: Configure Meta Webhooks
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }}>
                                        A webhook tells Meta where to forward incoming customer messages so that our AI bot can respond instantly.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0' }}>
                                        <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Callback URL</div>
                                                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#1e293b', wordBreak: 'break-all', marginTop: '4px', fontWeight: 600 }}>
                                                    {getWebhookUrl()}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(getWebhookUrl(), 'callback')}
                                                className="btn-outline"
                                                style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                                            >
                                                {copiedField === 'callback' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                                                {copiedField === 'callback' ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verify Token</div>
                                                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#1e293b', marginTop: '4px', fontWeight: 600 }}>
                                                    hello123
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy('hello123', 'token')}
                                                className="btn-outline"
                                                style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                                            >
                                                {copiedField === 'token' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                                                {copiedField === 'token' ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="wizard-guide-box">
                                        <h5 style={{ color: '#1e293b' }}><Info size={16} style={{ color: '#3b82f6' }} /> Setup Instructions:</h5>
                                        <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                            <li>In the Meta Developer Console, click <strong>WhatsApp</strong>, then select <strong>Configuration</strong> in the left sidebar.</li>
                                            <li>Next to Webhooks, click <strong>Edit</strong>.</li>
                                            <li>Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> copied from above. Click <strong>Verify and Save</strong>.</li>
                                            <li>Click <strong>Manage</strong> next to Webhook Fields, find the line named <strong>messages</strong>, and click <strong>Subscribe</strong>.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {currentStep === 8 && (
                                <div>
                                    <h4 className="step-header-title">
                                        <Check size={20} style={{ color: '#10b981' }} /> Step 8: Verify & Save Settings
                                    </h4>
                                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 20px', lineHeight: '1.5' }}>
                                        Please review the details entered. If they look correct, click the save button at the bottom.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div className="verify-item-row">
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>WABA ID</div>
                                                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#1e293b', marginTop: '4px', fontWeight: 600 }}>
                                                    {formData.wabaId || <span style={{ color: '#ef4444' }}>Not entered</span>}
                                                </div>
                                            </div>
                                            {formData.wabaId && <Check size={18} style={{ color: '#10b981' }} />}
                                        </div>

                                        <div className="verify-item-row">
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Phone Number ID</div>
                                                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#1e293b', marginTop: '4px', fontWeight: 600 }}>
                                                    {formData.phoneNumberId || <span style={{ color: '#ef4444' }}>Not entered</span>}
                                                </div>
                                            </div>
                                            {formData.phoneNumberId && <Check size={18} style={{ color: '#10b981' }} />}
                                        </div>

                                        <div className="verify-item-row">
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Permanent Access Token</div>
                                                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#1e293b', marginTop: '4px', fontWeight: 600 }}>
                                                    {formData.whatsappToken ? `${formData.whatsappToken.substring(0, 12)}... (masked)` : <span style={{ color: '#ef4444' }}>Not entered</span>}
                                                </div>
                                            </div>
                                            {formData.whatsappToken && <Check size={18} style={{ color: '#10b981' }} />}
                                        </div>

                                        <div className="verify-item-row">
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Store WhatsApp Phone</div>
                                                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#1e293b', marginTop: '4px', fontWeight: 600 }}>
                                                    {formData.storePhone || <span style={{ color: '#ef4444' }}>Not entered</span>}
                                                </div>
                                            </div>
                                            {formData.storePhone && <Check size={18} style={{ color: '#10b981' }} />}
                                        </div>

                                        <div className="verify-item-row">
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Gemini AI API Key (Optional)</div>
                                                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#1e293b', marginTop: '4px', fontWeight: 600 }}>
                                                    {formData.geminiApiKey ? `${formData.geminiApiKey.substring(0, 10)}...` : <span style={{ color: '#64748b', fontStyle: 'italic' }}>Not configured (Optional)</span>}
                                                </div>
                                            </div>
                                            {formData.geminiApiKey ? <Check size={18} style={{ color: '#10b981' }} /> : <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step Navigation Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                                disabled={currentStep === 1}
                                style={{ padding: '10px 20px', fontSize: '13.5px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                            {currentStep < 8 ? (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => setCurrentStep(prev => Math.min(8, prev + 1))}
                                    style={{ padding: '10px 24px', fontSize: '13.5px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    Next Step <ChevronRight size={16} />
                                </button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: '#10b981', fontWeight: 700 }}>
                                    <Check size={16} strokeWidth={3} /> Review Complete!
                                </div>
                            )}
                        </div>
                    </div>



                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '12px 32px' }} disabled={saving}>
                            {saving ? 'Saving Changes...' : <><Save size={18} /> Save Settings</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
