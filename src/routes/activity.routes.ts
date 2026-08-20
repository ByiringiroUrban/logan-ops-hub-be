import { Router } from "express";
import {
  listActivities,
  getActivityHistoryDates,
  getTodayActivityStats,
  deleteActivity,
  deleteActivities,
} from "../controllers/activity.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);
router.get("/dates", getActivityHistoryDates);
router.get("/today-stats", getTodayActivityStats);
router.get("/", listActivities);
router.delete("/:id", deleteActivity);
router.delete("/", deleteActivities);

export default router;
