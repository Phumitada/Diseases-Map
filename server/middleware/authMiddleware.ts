import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: {
        userId: number
        username: string;
        hospitalId: string;
        hospitalName: string;
        provinceId: string;
        provinceName: string;
    };
}

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = undefined; 
        return next();
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        req.user = decoded;
    } catch (error) {
        req.user = undefined;
    }
    next();
};