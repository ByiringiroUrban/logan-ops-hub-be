import { Router } from "express";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", listClients);
router.get("/:id", getClient);
router.post("/", createClient);
router.put("/:id", updateClient);
router.patch("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;
