'use strict';

const validators = require('./validators');
const schemas = require('./schemas');

module.exports = {
    ...validators,
    ...schemas
};
