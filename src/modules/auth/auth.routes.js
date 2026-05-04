
// Auth Routes
// Defines authentication-related endpoints


const express = require('express');
const { body } = require('express-validator');
const authController = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Validation rules
const registerValidation = [
  // body('email')
  //   .isEmail()
  //   .withMessage('Please provide a valid email')
  //   .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['farmer', 'expert', 'supplier'])
    .withMessage('Role must be farmer, expert, or supplier')
];

const loginValidation = [
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
    // .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     description: Creates a new user account with name, phone, password, and role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: Yusuf Ibrahim
 *               phone:
 *                 type: string
 *                 example: "08012345678"
 *               password:
 *                 type: string
 *                 example: "securePassword123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: user
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64f8a2c1e9b1a2c3d4e5f6g7"
 *                     name:
 *                       type: string
 *                       example: Yusuf Ibrahim
 *                     phone:
 *                       type: string
 *                       example: "08012345678"
 *                     role:
 *                       type: string
 *                       example: user
 *       400:
 *         description: Validation error (missing or invalid fields)
 *       409:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
// Routes
router.post('/register', registerValidation, authController.register);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     description: Authenticates a user with phone and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "08012345678"
 *               password:
 *                 type: string
 *                 example: "securePassword123"
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User logged in successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64f8a2c1e9b1a2c3d4e5f6g7"
 *                     name:
 *                       type: string
 *                       example: Yusuf Ibrahim
 *                     phone:
 *                       type: string
 *                       example: "08012345678"
 *                     role:
 *                       type: string
 *                       example: user
 *       400:
 *         description: Validation error (missing or invalid fields)
 *       409:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
router.post('/login', loginValidation, authController.login);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
