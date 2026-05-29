const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Admin, Branch, Tenant, GlobalConfig, OtpRecord } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const emailService = require('../services/emailService');

const login = async (req, res) => {
    const { username, password, tenantId } = req.body;

    try {
        let tenantIdInt = null;
        if (tenantId && tenantId.toString().trim() !== '') {
            tenantIdInt = parseInt(tenantId, 10);
            if (isNaN(tenantIdInt)) {
                return res.status(400).json({ error: 'Invalid Tenant ID format' });
            }
        }

        // 1. Check Superadmin
        if (!tenantIdInt) {
            const admin = await Admin.findOne({ where: { username } });
            if (admin && (await bcrypt.compare(password, admin.password))) {
                const token = jwt.sign({ username, role: 'superadmin' }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ token, role: 'superadmin' });
            }
        }

        // 2. Check Branch Admin
        const branchWhere = { username };
        if (tenantIdInt) {
            branchWhere.tenantId = tenantIdInt;
        }
        const branch = await Branch.findOne({
            where: branchWhere,
            include: [{ model: Tenant }]
        });
        if (branch && (await bcrypt.compare(password, branch.password))) {
            const token = jwt.sign({
                username,
                role: 'branch',
                branchId: branch.id,
                tenantId: branch.tenantId,
                branchName: branch.name
            }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({
                token,
                role: 'branch',
                branchId: branch.id,
                tenantId: branch.tenantId,
                tenantName: branch.Tenant?.name || 'Store',
                tenantLogo: branch.Tenant?.whatsappSettings?.logo || ''
            });
        }

        // 3. Check Tenant Admin
        const tenantWhere = { username, isActive: true };
        if (tenantIdInt) {
            tenantWhere.id = tenantIdInt;
        }
        const tenant = await Tenant.findOne({ where: tenantWhere });
        if (tenant && (await bcrypt.compare(password, tenant.password))) {
            const token = jwt.sign({
                username,
                role: 'tenant',
                tenantId: tenant.id,
                tenantName: tenant.name
            }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({
                token,
                role: 'tenant',
                tenantId: tenant.id,
                tenantName: tenant.name,
                tenantLogo: tenant.whatsappSettings?.logo || ''
            });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { username, role, tenantId, branchId } = req.user;

    try {
        let user;
        if (role === 'superadmin') {
            user = await Admin.findOne({ where: { username } });
        } else if (role === 'tenant') {
            user = await Tenant.findByPk(tenantId);
        } else if (role === 'branch') {
            user = await Branch.findByPk(branchId);
        }

        if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        return res.json({ message: 'Password updated successfully' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        let role = null;
        let userRecord = null;

        // 1. Check Superadmin: check if email matches SMTP configs
        const fromEmailConfig = await GlobalConfig.findOne({ where: { key: 'smtpFromEmail' } });
        const userEmailConfig = await GlobalConfig.findOne({ where: { key: 'smtpUser' } });
        const superadminEmail = fromEmailConfig?.value || userEmailConfig?.value;

        if (superadminEmail && email.trim().toLowerCase() === superadminEmail.trim().toLowerCase()) {
            const admin = await Admin.findOne();
            if (admin) {
                role = 'superadmin';
                userRecord = admin;
            }
        }

        // 2. Check Tenant Admin
        if (!userRecord) {
            const tenant = await Tenant.findOne({ where: { contactEmail: email } });
            if (tenant) {
                role = 'tenant';
                userRecord = tenant;
            }
        }

        // 3. Check Branch Admin
        if (!userRecord) {
            const branch = await Branch.findOne({
                include: [{
                    model: Tenant,
                    where: { contactEmail: email }
                }]
            });
            if (branch) {
                role = 'branch';
                userRecord = branch;
            }
        }

        if (!userRecord) {
            return res.status(404).json({ error: 'No account registered with this email address' });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Delete any existing OTP for this email
        await OtpRecord.destroy({ where: { email } });

        // Save OTP to database
        await OtpRecord.create({
            username: userRecord.username,
            otp,
            expiresAt: new Date(expiresAt),
            email,
            role
        });

        // Send Email
        await emailService.sendOtpEmail(email, userRecord.username, otp);

        // Mask email for display in UI
        const parts = email.split('@');
        const maskedLocal = parts[0].length > 2
            ? parts[0].substring(0, 2) + '*'.repeat(parts[0].length - 2)
            : parts[0] + '***';
        const maskedEmail = `${maskedLocal}@${parts[1]}`;

        return res.json({ success: true, message: 'OTP sent successfully', email: maskedEmail });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const record = await OtpRecord.findOne({ where: { email } });
    if (!record) {
        return res.status(400).json({ error: 'OTP request not found or expired' });
    }

    if (Date.now() > new Date(record.expiresAt).getTime()) {
        await record.destroy();
        return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp !== String(otp).trim()) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    return res.json({ success: true, message: 'OTP verified successfully' });
};

const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const record = await OtpRecord.findOne({ where: { email } });
    if (!record) {
        return res.status(400).json({ error: 'OTP request not found or expired' });
    }

    if (Date.now() > new Date(record.expiresAt).getTime()) {
        await record.destroy();
        return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp !== String(otp).trim()) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    try {
        let user;
        const { role, username } = record;
        if (role === 'superadmin') {
            user = await Admin.findOne({ where: { username } });
        } else if (role === 'tenant') {
            user = await Tenant.findOne({ where: { username } });
        } else if (role === 'branch') {
            user = await Branch.findOne({ where: { username } });
        }

        if (!user) {
            return res.status(404).json({ error: 'User account not found' });
        }

        user.password = newPassword;
        await user.save();

        // Clear OTP from database
        await record.destroy();

        return res.json({ success: true, message: 'Password updated successfully', username });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

module.exports = { login, changePassword, forgotPassword, verifyOtp, resetPassword };
