import { Router } from "express";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notification.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);
router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);
router.delete("/", deleteAllNotifications);

export default router;

