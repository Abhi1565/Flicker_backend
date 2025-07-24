import express from "express";
import { getMessage, sendMessage, deleteForMe, deleteForEveryone } from "../controllers/messageController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";

const router = express.Router();

router.route("/send/:id").post(isAuthenticated,sendMessage);
router.route("/:id").get(isAuthenticated, getMessage);
router.route("/delete-for-me/:messageId").delete(isAuthenticated, deleteForMe);
router.route("/delete-for-everyone/:messageId").delete(isAuthenticated, deleteForEveryone);

export default router;