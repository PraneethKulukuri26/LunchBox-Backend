const express=require("express");
const verifyToken=require("../../MiddleWare/verifyUserToken")
const router=express.Router();

const controller=require('../../Controller/User/authController');

router.post('/triggerOtpRes',controller.sendEmailReg);
router.post('/verifyOtp',controller.verifyOtp);
router.post('/login',controller.login);
router.post('/triggerOtpRest',controller.sendEmailForResetPassword);

router.post('/resetPassword',verifyToken,controller.resetPassword);
router.post('/registerUser',verifyToken,controller.registerUser);
router.post('/profile',verifyToken,controller.getProfile);

router.post('/test',verifyToken,controller.test);

module.exports=router;