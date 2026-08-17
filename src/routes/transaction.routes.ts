import { Router } from "express";
import {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transaction.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", listTransactions);
router.get("/:id", getTransaction);
router.post("/", createTransaction);
router.put("/:id", updateTransaction);
router.patch("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
