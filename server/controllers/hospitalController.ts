import { Request,Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export const getHospitals = async(req:Request,res:Response):Promise<void> => {
    try {
        const {category,search,provinceId,minbed,limit = 6,page = 1} = req.query
        const where: any = {}
        
        if(search){
            where.name = { contains: String(search) }
        }
        if(category){
            where.category = String(category)
        }
        if(provinceId){
            where.provinceId = String(provinceId)
        }
        if(minbed){
            where.beds = { gte: Number(minbed) }
        }

        const [Hospitals, total] = await Promise.all([
            prisma.hospital.findMany({
                where,
                skip: (Number(page)-1) * Number(limit),
                take: Number(limit),
                orderBy: { beds: 'desc' },
                include: {
                    province: true 
                }
            }),
            prisma.hospital.count({ where })
        ])

        res.status(200).json({
            data: Hospitals,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error })
    }
}