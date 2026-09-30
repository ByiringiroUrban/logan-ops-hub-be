import { Router } from "express";
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  giveAdvance,
  recordDeliveryDeduction,
  getEmployeeAdvances,
} from "../controllers/employee.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Read-only endpoints (accessible by ADMIN and FIELD_SUPERVISOR)
router.get("/", listEmployees);
router.get("/:id", getEmployee);
router.get("/:id/advances", getEmployeeAdvances);

// Mutation / CRUD endpoints (ADMIN only)
router.post("/", requireRole(Role.ADMIN), createEmployee);
router.put("/:id", requireRole(Role.ADMIN), updateEmployee);
router.patch("/:id", requireRole(Role.ADMIN), updateEmployee);
router.delete("/:id", requireRole(Role.ADMIN), deleteEmployee);

// Advance Management Endpoints
router.post("/:id/advance", requireRole(Role.ADMIN), giveAdvance);
router.post("/:id/deduction", requireRole(Role.ADMIN, Role.FIELD_SUPERVISOR), recordDeliveryDeduction);

export default router;

