import {
  buildReportTemplate,
  getPaymentRule,
  validateEvaluationMarks,
  validateInternshipCompliance,
} from "@prism/compliance";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const internshipDraftSchema = z.object({
  collegeId: z.string(),
  studentCollegeId: z.string(),
  studentProgram: z.enum(["BA", "BSC", "BCOM", "BBA", "BCA", "BVOC", "OTHER"]),
  internshipType: z.enum(["MAJOR", "MINOR", "INTERDISCIPLINARY", "ALLIED"]),
  mode: z.enum(["OFFLINE", "ONLINE"]),
  providerCategory: z.enum([
    "EDUCATIONAL_INSTITUTION",
    "RESEARCH_LAB",
    "GOVERNMENT_INSTITUTION",
    "NGO",
    "MSME_OR_INDUSTRY",
    "BANK_OR_FINANCIAL",
    "IT_OR_DIGITAL",
    "HEALTHCARE_OR_WELLNESS",
    "MEDIA_OR_CULTURAL",
    "AGRICULTURE_OR_ENVIRONMENT",
  ]),
  providerName: z.string(),
  providerIsPrivate: z.boolean(),
  providerYearsOfExperience: z.number().int().nonnegative(),
  partnerYearsOfExperience: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
  hasMoUUpload: z.boolean(),
  isOwnCollege: z.boolean(),
  semester: z.number().int(),
  affectsAcademicSchedule: z.boolean(),
  vacationPreferred: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
  totalHours: z.number().int().nonnegative(),
  industrySupervisorUserId: z.string().nullable().optional(),
  externalPlatform: z.enum(["KSHEC", "DIRECT"]).nullable().optional(),
  departmentCouncilApproved: z.boolean(),
});

export const complianceRoutes: FastifyPluginAsync = async (app) => {
  app.post("/compliance/validate-internship", async (request) => {
    const payload = internshipDraftSchema.parse(request.body);
    return validateInternshipCompliance(payload);
  });

  app.get("/compliance/report-template", async () => buildReportTemplate());

  app.get("/compliance/payment-rule/:source", async (request) => {
    const params = z
      .object({ source: z.enum(["INTERNAL", "EXTERNAL"]) })
      .parse(request.params);
    return getPaymentRule(params.source);
  });

  app.post("/compliance/validate-evaluation", async (request) => {
    const payload = z
      .object({ ccaMarks: z.number(), eseMarks: z.number() })
      .parse(request.body);
    return {
      errors: validateEvaluationMarks(payload),
    };
  });
};
