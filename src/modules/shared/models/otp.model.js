const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: String,
    otp: Number,

    expires_at:{
        type: Date,
        required: true
    },
    status: Boolean

}, {timestamps: true})

otpSchema.index({expires_at: 1}, {expireAfterSeconds: 0})

module.exports = otpModel = new mongoose.model("otp", otpSchema);
