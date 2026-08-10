import { Prisma, Prediction } from '@prisma/client';
import { prisma } from '../config/db';

export class PredictionRepository {
  async create(data: Prisma.PredictionUncheckedCreateInput): Promise<Prediction> {
    return prisma.prediction.create({
      data,
    });
  }

  async findByUserId(userId: string): Promise<Prediction[]> {
    return prisma.prediction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
