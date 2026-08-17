import { Router } from "express";
import { listActivities, deleteActivity, clearAllActivities } from "../controllers/activity.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);
router.get("/", listActivities);
router.delete("/:id", deleteActivity);
router.delete("/", clearAllActivities);

export default router;

