'use strict';

/**
 * Calculate points earned from a purchase
 * @param {number} spent - Amount spent
 * @param {Array} promotions - Active promotions with rate/points
 * @returns {number} Total points earned
 */
const calculatePoints = (spent, promotions = []) => {
    if (!isFinite(spent) || spent <= 0) {
        return 0;
    }

    const basePoints = Math.floor(spent * 4);
    const bonusPoints = promotions.reduce((acc, promo) => {
        let bonus = 0;
        if (promo.rate && isFinite(promo.rate)) {
            bonus += Math.floor(basePoints * promo.rate);
        }
        if (promo.points && isFinite(promo.points)) {
            bonus += Math.floor(promo.points);
        }
        return acc + bonus;
    }, 0);

    return Math.max(0, Math.floor(basePoints + bonusPoints));
};

/**
 * Resolve relative URL to absolute URL
 * @param {string} relativePath
 * @param {string} baseUrl
 * @returns {string}
 */
const resolveRelativeUrl = (relativePath, baseUrl) => {
    return new URL(relativePath, baseUrl).toString();
};

module.exports = {
    calculatePoints,
    resolveRelativeUrl
};
