import Otp from "@/models/otp";
import { sendOtpMail } from "@/lib/mailer";

const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtp = async (email: string): Promise<boolean> => {
    try {
        const generatedOtp = generateOTP();
        const normalizedEmail = email.toLowerCase().trim();

        await Otp.deleteMany({ email: normalizedEmail });

        const created_otp = await Otp.create({
            email: normalizedEmail,
            otp: Number(generatedOtp),
            expires_at: new Date(Date.now() + 2 * 60 * 1000),
            status: false,
        });

        if (!created_otp) {
            console.error(`[OTP] Failed to save OTP in database for ${normalizedEmail}`);
            return false;
        }

        const mailSent = await sendOtpMail(normalizedEmail, generatedOtp);
        if (!mailSent) {
            console.error(`[OTP] Failed to send OTP email to ${normalizedEmail}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[OTP] Error in sendOtp for ${email}:`, error);
        return false;
    }
};

export default sendOtp;
