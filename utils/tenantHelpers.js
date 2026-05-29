const { Tenant, Branch } = require('../models');
const { Op } = require('sequelize');

const getTenantConfig = async (tenantId) => {
    if (!tenantId) return {};
    const tenant = await Tenant.findByPk(tenantId);
    return tenant ? {
        phoneNumberId: tenant.phoneNumberId,
        whatsappToken: tenant.whatsappToken,
        catalogId: tenant.catalogId
    } : {};
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const checkDeliveryAvailability = async (branchId, latitude, longitude) => {
    if (!branchId) return { available: true };
    const branch = await Branch.findByPk(branchId);
    if (!branch) return { available: true };

    if (branch.latitude == null || branch.longitude == null || branch.deliveryRadius == null) {
        return { available: true };
    }

    if (latitude == null || longitude == null) {
        return { available: true };
    }

    const distance = calculateDistance(
        parseFloat(branch.latitude),
        parseFloat(branch.longitude),
        parseFloat(latitude),
        parseFloat(longitude)
    );

    const inRange = distance <= parseFloat(branch.deliveryRadius);
    return {
        available: inRange,
        distance,
        deliveryRadius: branch.deliveryRadius,
        reason: inRange ? null : 'out_of_radius'
    };
};

const findNearestBranch = async (tenantId, latitude, longitude) => {
    if (latitude == null || longitude == null) return null;
    try {
        const branches = await Branch.findAll({
            where: {
                tenantId,
                latitude: { [Op.not]: null },
                longitude: { [Op.not]: null }
            }
        });

        if (branches.length === 0) return null;

        let nearestBranch = null;
        let minDistance = Infinity;

        for (const branch of branches) {
            const dist = calculateDistance(
                parseFloat(branch.latitude),
                parseFloat(branch.longitude),
                parseFloat(latitude),
                parseFloat(longitude)
            );
            if (dist !== null && dist < minDistance) {
                minDistance = dist;
                nearestBranch = branch;
            }
        }

        return nearestBranch;
    } catch (e) {
        console.error('Error finding nearest branch:', e.message);
        return null;
    }
};

module.exports = { getTenantConfig, calculateDistance, checkDeliveryAvailability, findNearestBranch };
