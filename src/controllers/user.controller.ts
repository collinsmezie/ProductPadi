import { NextFunction, Request, Response } from "express";
import { getUserService } from "../services/user.service";

export const getUserController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id!

        const user = await getUserService(userId)

        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
} 