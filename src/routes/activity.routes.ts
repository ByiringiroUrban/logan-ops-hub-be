import { Router } from "express";
import { listActivities } from "../controllers/activity.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);
router.get("/", listActivities);

export default router;
