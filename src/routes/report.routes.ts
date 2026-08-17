import { Router } from "express";
import {
  getReportSummary,
  getDashboardAnalytics,
  exportPdf,
  exportExcel,
} from "../controllers/report.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/summary", getReportSummary);
router.get("/dashboard", getDashboardAnalytics);
router.get("/export/pdf", exportPdf);
router.get("/export/excel", exportExcel);

export default router;
