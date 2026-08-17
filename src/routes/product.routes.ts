import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

router.get("/", listProducts);
router.get("/:id", getProduct);

// ADMIN only routes
router.post("/", requireRole(Role.ADMIN), createProduct);
router.put("/:id", requireRole(Role.ADMIN), updateProduct);
router.patch("/:id", requireRole(Role.ADMIN), updateProduct);
router.delete("/:id", requireRole(Role.ADMIN), deleteProduct);

export default router;
