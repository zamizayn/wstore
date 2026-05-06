const admin = require('firebase-admin');
const path = require('path');
const { FcmToken, Notification } = require('../models');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, '../config/firebase-service-account.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

/**
 * Send push notification to all admins of a specific tenant
 */
async function sendToTenant(tenantId, title, body, type = 'general', extraData = {}) {
    try {
        // Save to notification history
        await Notification.create({
            title,
            body,
            type,
            tenantId,
            branchId: extraData.branchId || null,
            data: extraData
        });

        // Get all FCM tokens for this tenant
        const tokenRecords = await FcmToken.findAll({
            where: { tenantId }
        });

        if (tokenRecords.length === 0) return;

        const tokens = tokenRecords.map(t => t.token);

        const message = {
            notification: { title, body },
            data: {
                type,
                ...Object.fromEntries(Object.entries(extraData).map(([k, v]) => [k, String(v)]))
            }
        };

        // Send to each token (Firebase v12+ uses sendEachForMulticast)
        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            ...message
        });

        // Clean up invalid tokens
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(tokens[idx]);
            }
        });

        if (tokensToRemove.length > 0) {
            await FcmToken.destroy({ where: { token: tokensToRemove } });
            console.log(`[FCM] Cleaned up ${tokensToRemove.length} stale tokens`);
        }

        console.log(`[FCM] Sent "${title}" to ${response.successCount}/${tokens.length} devices for tenant ${tenantId}`);
    } catch (error) {
        console.error('[FCM] Error sending notification:', error.message);
    }
}

/**
 * Send push notification to all registered admins (for superadmin alerts)
 */
async function sendToAll(title, body, type = 'general', extraData = {}) {
    try {
        await Notification.create({ title, body, type, data: extraData });

        const tokenRecords = await FcmToken.findAll();
        if (tokenRecords.length === 0) return;

        const tokens = tokenRecords.map(t => t.token);

        await admin.messaging().sendEachForMulticast({
            tokens,
            notification: { title, body },
            data: {
                type,
                ...Object.fromEntries(Object.entries(extraData).map(([k, v]) => [k, String(v)]))
            }
        });

        console.log(`[FCM] Broadcast "${title}" to ${tokens.length} devices`);
    } catch (error) {
        console.error('[FCM] Error broadcasting:', error.message);
    }
}

module.exports = { sendToTenant, sendToAll };
