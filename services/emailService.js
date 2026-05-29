const nodemailer = require('nodemailer');
const { GlobalConfig } = require('../models');

/**
 * Dynamically retrieves SMTP settings from GlobalConfig database table and returns a transporter.
 */
async function getTransporter() {
  try {
    const configs = await GlobalConfig.findAll();
    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });

    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFromEmail,
      smtpFromName
    } = configMap;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn('[EmailService] SMTP configuration is incomplete. Skipping email sending.');
      return null;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465, // true for port 465, false for 587 or others
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const fromAddress = smtpFromEmail
      ? `"${smtpFromName || 'Friska Platform'}" <${smtpFromEmail}>`
      : smtpUser;

    return { transporter, fromAddress };
  } catch (error) {
    console.error('[EmailService] Error initializing SMTP transporter:', error.message);
    return null;
  }
}
const DEFAULT_SUBSCRIPTION_ACTIVATED_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Activated - {{tenantName}} 🎉</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #edf2f7;">
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Subscription Activated! 🎉</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px;">
        <p style="font-size: 16px; line-height: 24px; color: #1a202c; margin-top: 0;">Hi <strong>{{contactName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 24px; color: #4a5568;">Your subscription for <strong>{{tenantName}}</strong> has been successfully activated!</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: #166534; font-weight: 600;">Plan Details</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #15803d;">
            <strong>Plan:</strong> {{planName}}<br>
            <strong>Price:</strong> ₹{{planPrice}}/month<br>
            <strong>Start Date:</strong> {{startDate}}<br>
            <strong>End Date:</strong> {{endDate}}<br>
            <strong>Product Limit:</strong> {{productLimit}} products
          </p>
        </div>

        <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 0;">You now have access to all features included in your plan. We wish you great success!</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 40px 40px; text-align: center; border-top: 1px solid #edf2f7; background-color: #f8fafc;">
        <p style="margin: 0; font-size: 14px; color: #718096; font-weight: 600;">The Friska Team</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">Powered by Friska Platform</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

const DEFAULT_SUBSCRIPTION_RENEWED_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewed - {{tenantName}} 🔄</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #edf2f7;">
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Subscription Renewed! 🔄</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px;">
        <p style="font-size: 16px; line-height: 24px; color: #1a202c; margin-top: 0;">Hi <strong>{{contactName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 24px; color: #4a5568;">Your <strong>{{planName}}</strong> plan for <strong>{{tenantName}}</strong> has been renewed successfully!</p>
        
        <div style="background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: #312e81; font-weight: 600;">Renewal Details</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #4338ca;">
            <strong>Amount Charged:</strong> ₹{{planPrice}}<br>
            <strong>New End Date:</strong> {{endDate}}
          </p>
        </div>

        <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 0;">Thank you for continuing with us! We are committed to helping your business grow.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 40px 40px; text-align: center; border-top: 1px solid #edf2f7; background-color: #f8fafc;">
        <p style="margin: 0; font-size: 14px; color: #718096; font-weight: 600;">The Friska Team</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">Powered by Friska Platform</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

const DEFAULT_SUBSCRIPTION_CANCELLED_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancelled - {{tenantName}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #edf2f7;">
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Subscription Cancelled</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px;">
        <p style="font-size: 16px; line-height: 24px; color: #1a202c; margin-top: 0;">Hi <strong>{{contactName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 24px; color: #4a5568;">Your <strong>{{planName}}</strong> subscription for <strong>{{tenantName}}</strong> has been cancelled.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: #991b1b; font-weight: 600;">Important Information</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #b91c1c;">
            Your subscription will remain active until <strong>{{endDate}}</strong>.<br>
            After this date, access to premium features will be limited.
          </p>
        </div>

        <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 0;">If you change your mind, you can reactivate your subscription anytime. We hope to serve you again!</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 40px 40px; text-align: center; border-top: 1px solid #edf2f7; background-color: #f8fafc;">
        <p style="margin: 0; font-size: 14px; color: #718096; font-weight: 600;">The Friska Team</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">Powered by Friska Platform</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

function compileTemplate(htmlTemplate, variables) {
  let result = htmlTemplate;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value || '');
  }
  return result;
}

async function getTemplate(key, defaultVal) {
  try {
    const config = await GlobalConfig.findOne({ where: { key } });
    return config && config.value ? config.value : defaultVal;
  } catch (error) {
    console.error(`[EmailService] Error retrieving email template for ${key}:`, error.message);
    return defaultVal;
  }
}

/**
 * Sends a welcome onboarding email to a newly signed up tenant.
 */
async function sendWelcomeEmail(tenant) {
  if (!tenant || !tenant.contactEmail) {
    console.warn('[EmailService] Cannot send welcome email: tenant or contact email is missing.');
    return;
  }

  try {
    const configData = await getTransporter();
    if (!configData) return;

    const { transporter, fromAddress } = configData;

    const template = await getTemplate('welcomeEmailTemplate', DEFAULT_WELCOME_TEMPLATE);

    const paymentStatusNotice = tenant.paymentStatus === 'pending' ? `
      <!-- Alert Box for Pending Payment -->
      <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 15px; line-height: 22px; color: #92400e; font-weight: 600;">Action Required: One-Time Registration Fee</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #b45309;">
          To activate your online store and access the administration panel, please complete the registration fee payment using the onboarding screen or details provided in your registration flow.
        </p>
      </div>
    ` : `
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 15px; line-height: 22px; color: #166534; font-weight: 600;">Account Activated!</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #15803d;">
          Your store and settings are currently active. You can log in and start customizing your catalog now!
        </p>
      </div>
    `;

    const html = compileTemplate(template, {
      tenantName: tenant.name || 'your new business',
      contactName: tenant.contactName || 'Partner',
      paymentStatusNotice
    });

    const subject = `Welcome to Friska - ${tenant.name || 'Your Store'} is Created! 🚀`;
    const mailOptions = {
      from: fromAddress,
      to: tenant.contactEmail,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Welcome email sent to ${tenant.contactEmail}: ${info.messageId}`);
  } catch (error) {
    console.error('[EmailService] Error sending welcome email:', error.message);
  }
}

/**
 * Sends a payment confirmation email to a tenant once their registration fee has been captured.
 */
async function sendPaymentConfirmedEmail(tenant) {
  if (!tenant || !tenant.contactEmail) {
    console.warn('[EmailService] Cannot send payment confirmation email: tenant or contact email is missing.');
    return;
  }

  try {
    const configData = await getTransporter();
    if (!configData) return;

    const { transporter, fromAddress } = configData;

    const template = await getTemplate('paymentConfirmedEmailTemplate', DEFAULT_PAYMENT_CONFIRMED_TEMPLATE);

    const html = compileTemplate(template, {
      tenantName: tenant.name || 'your store',
      contactName: tenant.contactName || 'Partner'
    });

    const subject = `Payment Confirmed - ${tenant.name || 'Your Store'} is now Active! 🎉`;
    const mailOptions = {
      from: fromAddress,
      to: tenant.contactEmail,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Payment confirmation email sent to ${tenant.contactEmail}: ${info.messageId}`);
  } catch (error) {
    console.error('[EmailService] Error sending payment confirmation email:', error.message);
  }
}

async function sendOtpEmail(email, username, otp) {
  if (!email) {
    console.warn('[EmailService] Cannot send OTP email: email is missing.');
    return;
  }

  try {
    const configData = await getTransporter();
    if (!configData) return;

    const { transporter, fromAddress } = configData;

    const template = await getTemplate('otpEmailTemplate', DEFAULT_OTP_TEMPLATE);

    const html = compileTemplate(template, {
      username,
      otp
    });

    const subject = `Your Password Reset OTP Code - ${otp}`;
    const mailOptions = {
      from: fromAddress,
      to: email,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] OTP email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending OTP email:', error.message);
    throw error;
  }
}

async function sendSubscriptionActivatedEmail(tenant, plan) {
  if (!tenant || !tenant.contactEmail) {
    console.warn('[EmailService] Cannot send subscription activated email: tenant or contact email is missing.');
    return;
  }

  try {
    const configData = await getTransporter();
    if (!configData) return;

    const { transporter, fromAddress } = configData;

    const template = await getTemplate('subscriptionActivatedEmailTemplate', DEFAULT_SUBSCRIPTION_ACTIVATED_TEMPLATE);

    const html = compileTemplate(template, {
      tenantName: tenant.name || 'your store',
      contactName: tenant.contactName || 'Partner',
      planName: plan.name || 'N/A',
      planPrice: plan.price || '0',
      startDate: tenant.subscriptionStart ? new Date(tenant.subscriptionStart).toLocaleDateString('en-IN') : 'N/A',
      endDate: tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd).toLocaleDateString('en-IN') : 'N/A',
      productLimit: plan.productLimit || 'Unlimited'
    });

    const subject = `Subscription Activated - ${tenant.name} 🎉`;
    const mailOptions = {
      from: fromAddress,
      to: tenant.contactEmail,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Subscription activated email sent to ${tenant.contactEmail}: ${info.messageId}`);
  } catch (error) {
    console.error('[EmailService] Error sending subscription activated email:', error.message);
  }
}

async function sendSubscriptionRenewedEmail(tenant, plan) {
  if (!tenant || !tenant.contactEmail) {
    console.warn('[EmailService] Cannot send subscription renewed email: tenant or contact email is missing.');
    return;
  }

  try {
    const configData = await getTransporter();
    if (!configData) return;

    const { transporter, fromAddress } = configData;

    const template = await getTemplate('subscriptionRenewedEmailTemplate', DEFAULT_SUBSCRIPTION_RENEWED_TEMPLATE);

    const html = compileTemplate(template, {
      tenantName: tenant.name || 'your store',
      contactName: tenant.contactName || 'Partner',
      planName: plan.name || 'N/A',
      planPrice: plan.price || '0',
      endDate: tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd).toLocaleDateString('en-IN') : 'N/A'
    });

    const subject = `Subscription Renewed - ${tenant.name} 🔄`;
    const mailOptions = {
      from: fromAddress,
      to: tenant.contactEmail,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Subscription renewed email sent to ${tenant.contactEmail}: ${info.messageId}`);
  } catch (error) {
    console.error('[EmailService] Error sending subscription renewed email:', error.message);
  }
}

async function sendSubscriptionCancelledEmail(tenant, plan, endDate) {
  if (!tenant || !tenant.contactEmail) {
    console.warn('[EmailService] Cannot send subscription cancelled email: tenant or contact email is missing.');
    return;
  }

  try {
    const configData = await getTransporter();
    if (!configData) return;

    const { transporter, fromAddress } = configData;

    const template = await getTemplate('subscriptionCancelledEmailTemplate', DEFAULT_SUBSCRIPTION_CANCELLED_TEMPLATE);

    const html = compileTemplate(template, {
      tenantName: tenant.name || 'your store',
      contactName: tenant.contactName || 'Partner',
      planName: plan.name || 'N/A',
      endDate: endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'N/A'
    });

    const subject = `Subscription Cancelled - ${tenant.name}`;
    const mailOptions = {
      from: fromAddress,
      to: tenant.contactEmail,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Subscription cancelled email sent to ${tenant.contactEmail}: ${info.messageId}`);
  } catch (error) {
    console.error('[EmailService] Error sending subscription cancelled email:', error.message);
  }
}

module.exports = {
  sendWelcomeEmail,
  sendPaymentConfirmedEmail,
  sendOtpEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionRenewedEmail,
  sendSubscriptionCancelledEmail
};
