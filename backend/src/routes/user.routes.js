import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { userController } from "../controllers/user.controller.js";

const router = Router();

router.get("/me", requireAuth, userController.me);
router.patch("/me", requireAuth, userController.updateMe);
router.get("/me/progress", requireAuth, userController.getMyProgress);
router.get("/", requireAuth, requireRole("ADMIN"), userController.list);

export default router;
