import Router from 'express';
import { userGetAll, userUpdateRole, userUpdateStatus } from '../modules/users/users.controller';
import { asyncHandler } from '../utils/async-handler';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authorize } from '../middleware/role.middleware';

const router = Router();

router.get('/',authenticate, authorize('ADMIN'), asyncHandler(userGetAll));
router.patch('/:userId/role/',authenticate, authorize('ADMIN'), asyncHandler(userUpdateRole))
router.patch('/:userId/status/', authenticate, authorize('ADMIN'), asyncHandler(userUpdateStatus))

export default router;
