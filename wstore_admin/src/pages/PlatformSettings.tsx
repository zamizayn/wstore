import { useEffect, useState } from 'react';
import { Settings, Save, Phone, IndianRupee, Loader2, Globe, MessageSquare, Mail } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const DEFAULT_WELCOME_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Friska - {{tenantName}} is Created! 🚀</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #edf2f7;">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Friska! 🚀</h1>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="font-size: 16px; line-height: 24px; color: #1a202c; margin-top: 0;">Hi <strong>{{contactName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 24px; color: #4a5568;">Thank you for registering your store, <strong>{{tenantName}}</strong>, on our platform. We are thrilled to partner with you!</p>
        
        {{paymentStatusNotice}}

        <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 0;">If you have any questions or need setup assistance, simply reply to this email or reach out to our WhatsApp support team. We're here to help!</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px 40px; text-align: center; border-top: 1px solid #edf2f7; background-color: #f8fafc;">
        <p style="margin: 0; font-size: 14px; color: #718096; font-weight: 600;">The Friska Team</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">Powered by Friska Platform</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

const DEFAULT_PAYMENT_CONFIRMED_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed - {{tenantName}} is now Active! 🎉</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #edf2f7;">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Payment Confirmed! 🎉</h1>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="font-size: 16px; line-height: 24px; color: #1a202c; margin-top: 0;">Hi <strong>{{contactName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 24px; color: #4a5568;">Great news! We have successfully received and verified your one-time registration fee payment for <strong>{{tenantName}}</strong>.</p>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: #065f46; font-weight: 600;">Your store is now fully active!</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #047857;">
            You are now ready to access all the features on your Friska store. Head over to your dashboard to customize settings, add products, and configure delivery configurations.
          </p>
        </div>

        <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 0;">Thank you for partnering with us. We wish you immense success with your business!</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px 40px; text-align: center; border-top: 1px solid #edf2f7; background-color: #f8fafc;">
        <p style="margin: 0; font-size: 14px; color: #718096; font-weight: 600;">The Friska Team</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">Powered by Friska Platform</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

const DEFAULT_OTP_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Password Reset OTP Code - {{otp}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #edf2f7;">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Password Reset</h1>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="font-size: 16px; line-height: 24px; color: #1a202c; margin-top: 0;">Hi <strong>{{username}}</strong>,</p>
        <p style="font-size: 16px; line-height: 24px; color: #4a5568;">We received a request to reset your account password. Use the following One-Time Password (OTP) to complete the verification process. This OTP is valid for 10 minutes.</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; font-family: monospace; font-size: 36px; font-weight: 700; color: #4f46e5; letter-spacing: 6px; padding: 12px 28px; background-color: #f0f0ff; border-radius: 8px; border: 1px dashed #7c3aed;">
            {{otp}}
          </span>
        </div>

        <p style="font-size: 14px; line-height: 20px; color: #718096;">If you did not initiate this request, you can safely ignore this email. Your password will remain unchanged.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px 40px; text-align: center; border-top: 1px solid #edf2f7; background-color: #f8fafc;">
        <p style="margin: 0; font-size: 14px; color: #718096; font-weight: 600;">The Friska Team</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">Powered by Friska Platform</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

export default function PlatformSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configs, setConfigs] = useState({
        registrationFee: '',
        superAdminWhatsApp: '',
        platformRazorpayKeyId: '',
        platformRazorpayKeySecret: '',
        platformRazorpayWebhookSecret: '',
        supportBotPrefilledMessage: '',
        globalWabaId: '',
        globalPhoneNumberId: '',
        globalWhatsappToken: '',
        smtpHost: '',
        smtpPort: '',
        smtpUser: '',
        smtpPass: '',
        smtpFromEmail: '',
        smtpFromName: '',
        welcomeEmailTemplate: '',
        paymentConfirmedEmailTemplate: '',
        otpEmailTemplate: ''
    });

    const [activeTab, setActiveTab] = useState('welcome');

    const activeTemplateKey = 
        activeTab === 'welcome' ? 'welcomeEmailTemplate' :
        activeTab === 'payment' ? 'paymentConfirmedEmailTemplate' :
        'otpEmailTemplate';

    const getPreviewHtml = () => {
        const template = configs[activeTemplateKey] || '';
        let compiled = template;
        
        const mockValues = {
            tenantName: 'Acme Coffee Roast',
            contactName: 'Jane Smith',
            username: 'janesmith123',
            otp: '582914',
            paymentStatusNotice: `
                <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; font-size: 15px; line-height: 22px; color: #92400e; font-weight: 600;">Action Required: One-Time Registration Fee</p>
                  <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #b45309;">
                    To activate your online store and access the administration panel, please complete the registration fee payment.
                  </p>
                </div>
            `
        };
        
        for (const [key, val] of Object.entries(mockValues)) {
            compiled = compiled.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), val);
        }
        return compiled;
    };

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const res = await fetch(API_ENDPOINTS.GLOBAL_CONFIGS, {
                    headers: getHeaders()
                });
                const data = await res.json();
                if (!data.supportBotPrefilledMessage) {
                    data.supportBotPrefilledMessage = "Hi there! 👋 I have successfully paid the registration fee for *{{store_name}}*. Could you please guide me on how to set up my business account?";
                }
                if (!data.welcomeEmailTemplate) data.welcomeEmailTemplate = DEFAULT_WELCOME_TEMPLATE;
                if (!data.paymentConfirmedEmailTemplate) data.paymentConfirmedEmailTemplate = DEFAULT_PAYMENT_CONFIRMED_TEMPLATE;
                if (!data.otpEmailTemplate) data.otpEmailTemplate = DEFAULT_OTP_TEMPLATE;
                setConfigs(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfigs();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(API_ENDPOINTS.GLOBAL_CONFIGS, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(configs)
            });
            if (res.ok) {
                alert('Platform settings updated successfully');
            } else {
                alert('Failed to update settings');
            }
        } catch (e) {
            alert('Connection error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin text-accent" size={32} />
            </div>
        );
    }

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Platform Settings</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Global configurations for the Friska platform</p>
                </div>
            </header>

            <div style={{ maxWidth: '1250px' }}>
                <form onSubmit={handleSave}>
                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <IndianRupee size={20} className="text-accent" />
                            Onboarding & Fees
                        </h3>

                        <div className="input-group">
                            <label>One-time Registration Fee (₹)</label>
                            <input
                                type="number"
                                placeholder="1000"
                                value={configs.registrationFee}
                                onChange={e => setConfigs({ ...configs, registrationFee: e.target.value })}
                                required
                            />
                            <p className="input-help">Amount in INR that new tenants must pay to activate their account.</p>
                        </div>
                    </div>

                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <Globe size={20} className="text-accent" />
                            Global Payments (Razorpay)
                        </h3>

                        <div className="input-group">
                            <label>Razorpay Key ID</label>
                            <input
                                type="text"
                                placeholder="rzp_..."
                                value={configs.platformRazorpayKeyId || ''}
                                onChange={e => setConfigs({ ...configs, platformRazorpayKeyId: e.target.value })}
                            />
                            <p className="input-help">Global Razorpay Key ID used for platform payments like registration fees.</p>
                        </div>

                        <div className="input-group">
                            <label>Razorpay Key Secret</label>
                            <input
                                type="password"
                                placeholder="Enter Key Secret"
                                value={configs.platformRazorpayKeySecret || ''}
                                onChange={e => setConfigs({ ...configs, platformRazorpayKeySecret: e.target.value })}
                            />
                        </div>

                        <div className="input-group">
                            <label>Razorpay Webhook Secret</label>
                            <input
                                type="password"
                                placeholder="Enter Webhook Secret"
                                value={configs.platformRazorpayWebhookSecret || ''}
                                onChange={e => setConfigs({ ...configs, platformRazorpayWebhookSecret: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <Mail size={20} className="text-accent" />
                            Email SMTP Configurations
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>SMTP Host</label>
                                <input
                                    type="text"
                                    placeholder="smtp.example.com"
                                    value={configs.smtpHost || ''}
                                    onChange={e => setConfigs({ ...configs, smtpHost: e.target.value })}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>SMTP Port</label>
                                <input
                                    type="text"
                                    placeholder="587"
                                    value={configs.smtpPort || ''}
                                    onChange={e => setConfigs({ ...configs, smtpPort: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>SMTP Username</label>
                                <input
                                    type="text"
                                    placeholder="user@example.com"
                                    value={configs.smtpUser || ''}
                                    onChange={e => setConfigs({ ...configs, smtpUser: e.target.value })}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>SMTP Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter SMTP Password"
                                    value={configs.smtpPass || ''}
                                    onChange={e => setConfigs({ ...configs, smtpPass: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Sender Email</label>
                                <input
                                    type="email"
                                    placeholder="noreply@yourdomain.com"
                                    value={configs.smtpFromEmail || ''}
                                    onChange={e => setConfigs({ ...configs, smtpFromEmail: e.target.value })}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Sender Name</label>
                                <input
                                    type="text"
                                    placeholder="Friska Team"
                                    value={configs.smtpFromName || ''}
                                    onChange={e => setConfigs({ ...configs, smtpFromName: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <Mail size={20} className="text-accent" />
                            Email Templates
                        </h3>

                        {/* Tab Buttons */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            borderBottom: '1px solid var(--border-color)',
                            marginBottom: '24px',
                            paddingBottom: '1px'
                        }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('welcome')}
                                className={`tab-btn ${activeTab === 'welcome' ? 'active' : ''}`}
                            >
                                Welcome Email
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('payment')}
                                className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
                            >
                                Payment Confirmed
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('otp')}
                                className={`tab-btn ${activeTab === 'otp' ? 'active' : ''}`}
                            >
                                Password OTP
                            </button>
                        </div>

                        <div className="templates-grid">
                            {/* Editor Column */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className="input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                                    <label style={{ textTransform: 'capitalize' }}>
                                        {activeTab} Email Template (HTML)
                                    </label>
                                    <textarea
                                        value={configs[activeTemplateKey] || ''}
                                        onChange={e => setConfigs({ ...configs, [activeTemplateKey]: e.target.value })}
                                        rows={18}
                                        style={{
                                            width: '100%',
                                            flex: 1,
                                            minHeight: '580px',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-app)',
                                            color: 'var(--text-main)',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            resize: 'vertical',
                                            lineHeight: '1.6'
                                        }}
                                    />
                                    {activeTab === 'welcome' && (
                                        <p className="input-help">
                                            Variables: <code>{`{{tenantName}}`}</code>, <code>{`{{contactName}}`}</code>, <code>{`{{paymentStatusNotice}}`}</code>.
                                        </p>
                                    )}
                                    {activeTab === 'payment' && (
                                        <p className="input-help">
                                            Variables: <code>{`{{tenantName}}`}</code>, <code>{`{{contactName}}`}</code>.
                                        </p>
                                    )}
                                    {activeTab === 'otp' && (
                                        <p className="input-help">
                                            Variables: <code>{`{{username}}`}</code>, <code>{`{{otp}}`}</code>.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Preview Column */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Live Preview
                                </label>
                                <div className="email-preview-container" style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    background: '#ffffff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: 'calc(100% - 28px)'
                                }}>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #edf2f7',
                                        fontSize: '12px',
                                        color: '#64748b',
                                        fontFamily: 'sans-serif'
                                    }}>
                                        <div style={{ marginBottom: '4px' }}>
                                            <strong style={{ color: '#334155' }}>From:</strong> {configs.smtpFromName || 'Friska Platform'} &lt;{configs.smtpFromEmail || 'noreply@yourdomain.com'}&gt;
                                        </div>
                                        <div>
                                            <strong style={{ color: '#334155' }}>To:</strong> {activeTab === 'otp' ? 'john@example.com' : 'partner-store@example.com'}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, background: '#f1f5f9', padding: '16px', minHeight: '580px' }}>
                                        <iframe
                                            title="Email Preview"
                                            srcDoc={getPreviewHtml()}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                minHeight: '550px',
                                                border: 'none',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                                                background: '#ffffff'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Settings</>}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .input-help {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-top: 8px;
                }
                .text-accent { color: var(--accent); }
                .tab-btn {
                    padding: 8px 16px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                }
                .tab-btn:hover {
                    color: var(--text-main);
                }
                .tab-btn.active {
                    color: var(--accent);
                    border-bottom: 2px solid var(--accent);
                }
                .templates-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }
                @media (max-width: 900px) {
                    .templates-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
