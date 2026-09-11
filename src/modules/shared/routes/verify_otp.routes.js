const router = require("express").Router();

const verifyOtp = require("../controllers/verify_otp.controller");
const resendOtp = require("../controllers/resend_otp.controller");

router.post("/verify", verifyOtp);
router.post("/resend", resendOtp);

module.exports = router;