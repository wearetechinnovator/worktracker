const router = require('express').Router();
const userRoute = require('../module/users/user.routes');
const verifyOtpRoute = require('../module/shared/routes/verify_otp.routes');



router
    .use('/users', userRoute)

router.use('/otp', verifyOtpRoute)

module.exports = router;