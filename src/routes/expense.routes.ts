import { Router } from "express";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expense.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

router.get("/", listExpenses);
router.post("/", requireRole(Role.ADMIN), createExpense);
router.put("/:id", requireRole(Role.ADMIN), updateExpense);
router.patch("/:id", requireRole(Role.ADMIN), updateExpense);
router.delete("/:id", requireRole(Role.ADMIN), deleteExpense);

export default router;
