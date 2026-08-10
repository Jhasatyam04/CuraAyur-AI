import { z } from 'zod';

export const diabetesPredictionSchema = z.object({
  body: z.object({
    fastingGlucose: z.number(),
    bp: z.number(),
    bmi: z.number(),
    age: z.number(),
    hba1c: z.number().optional().default(5.5),
    familyHistory: z.string().optional().default("no"),
    activity: z.string().optional().default("moderate"),
    sex: z.string().optional().default("male"),
  }),
});

export const cardioPredictionSchema = z.object({
  body: z.object({
    age: z.number(),
    sex: z.string(),
    height: z.number(),
    weight: z.number(),
    cholesterol: z.number(),
    bp: z.number(),
    glucose: z.number(),
  }),
});

export const breastCancerPredictionSchema = z.object({
  body: z.object({
    radiusMean: z.number(),
    textureMean: z.number(),
    perimeterMean: z.number(),
    areaMean: z.number(),
    smoothnessMean: z.number(),
    concavityMean: z.number(),
    concavePointsMean: z.number(),
  }),
});
