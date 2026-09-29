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
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", listEmployees);
router.get("/:id", getEmployee);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.patch("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

// Advance Management Endpoints
router.post("/:id/advance", giveAdvance);
router.post("/:id/deduction", recordDeliveryDeduction);
router.get("/:id/advances", getEmployeeAdvances);

export default router;
