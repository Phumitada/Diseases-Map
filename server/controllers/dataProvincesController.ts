import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getRiskFilter = (risk: string) => {
  switch (risk) {
    case "normal": return { gte: 0, lte: 500 };
    case "warning": return { gte: 501, lte: 3000 };
    case "emergency": return { gt: 3000 };
    default: return null;
  }
};

const buildProvinceMap = (
  reports: { hospitalId: string; diseaseId: number; _count: { id: number } }[],
  hospitalMap: Record<string, string>,
  diseaseMap: Record<number, string>
) => {
  const provinceMap: Record<string, { provinceName: string; totalCount: number; diseases: Record<string, number> }> = {};

  for (const r of reports) {
    const provinceId = hospitalMap[r.hospitalId];
    const diseaseName = diseaseMap[r.diseaseId];
    if (!provinceId || !diseaseName) continue;

    if (!provinceMap[provinceId]) provinceMap[provinceId] = { provinceName: provinceId, totalCount: 0, diseases: {} };
    provinceMap[provinceId].totalCount += r._count.id;
    provinceMap[provinceId].diseases[diseaseName] = (provinceMap[provinceId].diseases[diseaseName] || 0) + r._count.id;
  }

  return provinceMap;
};

const getSharedData = async () => {
  const [reports, hospitals, diseases] = await Promise.all([
    prisma.report.groupBy({ by: ["hospitalId", "diseaseId"], _count: { id: true } }),
    prisma.hospital.findMany({ select: { id: true, provinceId: true } }),
    prisma.disease.findMany({ select: { id: true, name: true } }),
  ]);

  const hospitalMap = Object.fromEntries(hospitals.map(h => [h.id, h.provinceId]));
  const diseaseMap = Object.fromEntries(diseases.map(d => [d.id, d.name]));

  return { reports, hospitalMap, diseaseMap };
};

const applyRiskFilter = (data: any[], risk: string) => {
  const riskFilter = getRiskFilter(risk);
  if (!riskFilter) return data;
  return data.filter(p => {
    if (riskFilter.gte !== undefined && p.totalCount < riskFilter.gte) return false;
    if (riskFilter.lte !== undefined && p.totalCount > riskFilter.lte) return false;
    if (riskFilter.gt !== undefined && p.totalCount <= riskFilter.gt) return false;
    return true;
  });
};

const applySort = (data: any[], order: string) => {
  return data.sort((a, b) => {
    if (order.includes("name")) {
      return order === "name_asc"
        ? a.provinceName.localeCompare(b.provinceName)
        : b.provinceName.localeCompare(a.provinceName);
    }
    return order === "count_asc" ? a.totalCount - b.totalCount : b.totalCount - a.totalCount;
  });
};

export const getDataProvince = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "9", order = "count_desc", risk = "all" } = req.query;
    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const { reports, hospitalMap, diseaseMap } = await getSharedData();
    const provinceMap = buildProvinceMap(reports, hospitalMap, diseaseMap);

    let data = Object.values(provinceMap).map(p => ({
      provinceName: p.provinceName,
      totalCount: p.totalCount,
      diseases: Object.entries(p.diseases).map(([diseaseName, count]) => ({ diseaseName, count })),
    }));

    data = applyRiskFilter(data, risk as string);
    data = applySort(data, order as string);

    res.status(200).json({ success: true, page: pageNumber, limit: limitNumber, risk, data: data.slice(skip, skip + limitNumber) });
  } catch (error) {
    console.error("Get Province Disease Data Error:", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในระบบ" });
  }
};

export const getDataProvinceCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { order = "count_desc", type = "province" } = req.query;
    const response: any = { success: true };

    if (type === "province") {
      const { reports, hospitalMap } = await getSharedData();
      const provinceMap: Record<string, number> = {};
      for (const r of reports) {
        const provinceId = hospitalMap[r.hospitalId];
        if (!provinceId) continue;
        provinceMap[provinceId] = (provinceMap[provinceId] || 0) + r._count.id;
      }
      const data = Object.entries(provinceMap)
        .map(([provinceName, totalCount]) => ({ provinceName, totalCount }))
        .sort((a, b) => order === "count_asc" ? a.totalCount - b.totalCount : b.totalCount - a.totalCount);
      response.data = data;
      response.total = data.length;

    } else if (type === "disease") {
      const reports = await prisma.report.groupBy({ by: ["diseaseId"], _count: { id: true } });
      const diseases = await prisma.disease.findMany({ select: { id: true, name: true } });
      const diseaseMap = Object.fromEntries(diseases.map(d => [d.id, d.name]));
      const data = reports
        .map(r => ({ diseaseName: diseaseMap[r.diseaseId] || "", patientCount: r._count.id, totalCases: r._count.id }))
        .sort((a, b) => order === "count_asc" ? a.patientCount - b.patientCount : b.patientCount - a.patientCount);
      response.diseaseData = data;
      response.totalDiseases = data.length;

    } else if (type === "total") {
      response.totalPatients = await prisma.report.count();
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Get Province Count Error:", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในระบบ" });
  }
};

export const getDataProvinceMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { order = "count_desc", risk = "all", disease } = req.query;

    const { reports, hospitalMap, diseaseMap } = await getSharedData();
    const provinceMap = buildProvinceMap(reports, hospitalMap, diseaseMap);

    let data = Object.values(provinceMap).map(p => ({
      provinceName: p.provinceName,
      totalCount: p.totalCount,
      diseases: Object.entries(p.diseases).map(([diseaseName, count]) => ({ diseaseName, count })),
      ...(disease ? { diseaseCount: p.diseases[disease as string] || 0 } : {}),
    }));

    data = applyRiskFilter(data, risk as string);
    data = applySort(data, order as string);

    const diseaseTotals: Record<string, number> = {};
    data.forEach(p => p.diseases.forEach((d: any) => {
      diseaseTotals[d.diseaseName] = (diseaseTotals[d.diseaseName] || 0) + d.count;
    }));

    res.status(200).json({ success: true, risk, disease: disease || null, diseaseTotals, data });
  } catch (error) {
    console.error("Get Province Disease Data Error:", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในระบบ" });
  }
};