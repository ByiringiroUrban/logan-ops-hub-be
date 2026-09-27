import { Router } from "express";
import {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
} from "../controllers/sale.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", listSales);
router.get("/:id", getSale);
router.post("/", createSale);
router.put("/:id", updateSale);
router.patch("/:id", updateSale);
router.delete("/:id", deleteSale);

export default router;
