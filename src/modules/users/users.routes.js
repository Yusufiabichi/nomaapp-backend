/**
 * Users Routes
 * Defines user-related endpoints
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const usersController = require('./users.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

const createUserValidation = [
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
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get authenticated user profile
 *     tags: [Users]
 *     description: Returns the profile information of the currently logged-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "6634d9c91c6f4f0012345678"
 *                     name:
 *                       type: string
 *                       example: Yusuf Ibrahim
 *                     phone:
 *                       type: string
 *                       example: "08012345678"
 *                     role:
 *                       type: string
 *                       example: user
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
// User routes
router.get('/profile', usersController.getProfile);
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update authenticated user profile
 *     tags: [Users]
 *     description: Updates the logged-in user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Yusuf Ibrahim
 *               phone:
 *                 type: string
 *                 example: "08012345678"
 *               password:
 *                 type: string
 *                 example: "newSecurePassword123"
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', updateProfileValidation, usersController.updateProfile);
/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Deactivate user account
 *     tags: [Users]
 *     description: Deactivates or soft deletes the authenticated user's account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
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
 *                   example: Account deactivated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/account', usersController.deactivateAccount);
// router.post("/register", registerUser);
router.post('/user', createUserValidation, usersController.createAccount);

// Admin routes
router.get('/', authorize('admin'), usersController.getAllUsers);
router.get('/:id', authorize('admin'), param('id').isMongoId(), usersController.getUserById);

module.exports = router;
