import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, ExternalLink, Key, Phone, Settings, Globe, Layout, Hexagon } from 'lucide-react';

const steps = [
    {
        title: "Create Meta App",
        icon: <Layout className="vibrant-icon" />,
        content: "Visit the Meta Developer Portal and create a new 'Business' app. Add 'WhatsApp' to your app products.",
        link: "https://developers.facebook.com"
    },
    {
        title: "Connect Phone",
        icon: <Phone className="vibrant-icon" />,
        content: "Under WhatsApp > Getting Started, follow the instructions to link your business phone number.",
        link: null
    },
    {
        title: "Permanent Token",
        icon: <Key className="vibrant-icon" />,
        content: "Go to Business Settings > System Users. Create an Admin user, and generate a token with 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions.",
        link: null
    },
    {
        title: "Configure Webhook",
        icon: <Globe className="vibrant-icon" />,
        content: "In WhatsApp > Configuration, set your Callback URL to your WStore domain and use Verify Token 'hello123'. Subscribe to 'messages'.",
        link: null
    },
    {
        title: "Collect IDs",
        icon: <Settings className="vibrant-icon" />,
        content: "Copy your Phone Number ID and WhatsApp Business Account ID from the WhatsApp Getting Started page.",
        link: null
    },
    {
        title: "Finalize Setup",
        icon: <CheckCircle2 className="vibrant-icon" />,
        content: "You're ready! Click below to enter your credentials and launch your AI-powered storefront.",
        link: null
    }
];

export default function OnboardingGuide() {
    const [activeStep, setActiveStep] = useState(0);
    const navigate = useNavigate();

    const handleNext = () => {
        if (activeStep === steps.length - 1) {
            navigate('/onboard-wizard');
        } else {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    return (
        <div className="onboarding-guide-page premium-dark">
            <div className="guide-background-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <div className="guide-container">
                {/* Header */}
                <header className="guide-header-minimal">
                    <div className="landing-logo">
                        <Hexagon className="vibrant-icon pulse" size={32} />
                        <span className="brand-name">WStore Setup</span>
                    </div>
                    <div className="step-dots">
                        {steps.map((_, i) => (
                            <div key={i} className={`dot ${i === activeStep ? 'active' : ''} ${i < activeStep ? 'done' : ''}`}></div>
                        ))}
                    </div>
                    <Link to="/" className="close-guide"><X size={24} /></Link>
                </header>

                <main className="guide-main-card-wrapper">
                    <div className={`guide-step-card glass-morph animate-slide-up`}>
                        <div className="card-left">
                            <div className="step-counter">STEP {activeStep + 1}</div>
                            <h1 className="step-title">{steps[activeStep].title}</h1>
                            <p className="step-description">{steps[activeStep].content}</p>
                            
                            {steps[activeStep].link && (
                                <a href={steps[activeStep].link} target="_blank" rel="noreferrer" className="meta-link-btn">
                                    <ExternalLink size={18} /> Open Developer Portal
                                </a>
                            )}

                            <div className="card-footer-actions">
                                <button 
                                    onClick={handleBack} 
                                    className={`nav-btn btn-back ${activeStep === 0 ? 'invisible' : ''}`}
                                >
                                    <ArrowLeft size={20} /> Previous
                                </button>
                                
                                <button onClick={handleNext} className="nav-btn btn-next">
                                    <span>{activeStep === steps.length - 1 ? "Start Integration" : "Next Step"}</span>
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="card-right visual-area">
                            <div className="visual-illustration">
                                {steps[activeStep].icon}
                                <div className="glow-effect"></div>
                            </div>
                            <div className="tip-box">
                                <strong>💡 Pro Tip:</strong>
                                <span>{indexToTip[activeStep]}</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

const indexToTip = [
    "Choose 'Business' as the app type to unlock professional WhatsApp features.",
    "Make sure you have access to the phone's SMS/Call to verify the OTP.",
    "Tokens generated via 'System Users' never expire, unlike temporary user tokens.",
    "The callback URL should be HTTPS. We've simplified the verification process for you.",
    "These IDs are permanent. Keep them safe or store them directly in the next step.",
    "You're all set! Make sure your browser allows pop-ups for the launch wizard."
];

import { X } from 'lucide-react';
