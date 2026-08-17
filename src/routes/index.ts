import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import clientRoutes from "./client.routes";
import productRoutes from "./product.routes";
import transactionRoutes from "./transaction.routes";
import expenseRoutes from "./expense.routes";
import documentRoutes from "./document.routes";
import reportRoutes from "./report.routes";
import activityRoutes from "./activity.routes";
import notificationRoutes from "./notification.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/products", productRoutes);
router.use("/transactions", transactionRoutes);
router.use("/expenses", expenseRoutes);
router.use("/documents", documentRoutes);
router.use("/reports", reportRoutes);
router.use("/activities", activityRoutes);
router.use("/notifications", notificationRoutes);

export default router;
