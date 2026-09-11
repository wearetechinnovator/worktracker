const otpModel = require('../modules/shared/models/otp.model');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const sendOtp = async(email)=>{
    const generatedOtp = generateOTP();
    await otpModel.deleteMany({email})
    const created_otp = await otpModel.create({
        email,
        otp: generatedOtp,
        expires_at: new Date(Date.now() + 2 * 60 * 1000)
    })
    if(!created_otp){
        return false;
    }
    return true;
}

module.exports = sendOtp;