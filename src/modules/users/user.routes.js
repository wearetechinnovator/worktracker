const { registerUser } = require('./user.controller');

const router = require('express').Router();

router
.route('/register')
.post(registerUser)

module.exports = router