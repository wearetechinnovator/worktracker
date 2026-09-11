const bcrypt = require("bcryptjs");
const userModel = require("./user.model");
const sendOtp = require("../../utils/otp");

const registerUser = async (req, res) => {
    try {
        const {
            full_name,
            email,
            password,
        } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check existing user
        const existingUser = await userModel.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        // isVerify automatically false from model
        const user = await userModel.create({
            full_name: full_name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
        });

        // Send OTP
        const otpSent = await sendOtp(normalizedEmail);

        if (!otpSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate OTP"
            });
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(201).json({
            success: true,
            message: "User created. OTP sent successfully.",
            data: userResponse
        });

    } catch (error) {
        console.error("Register User Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

module.exports = {
    registerUser
};