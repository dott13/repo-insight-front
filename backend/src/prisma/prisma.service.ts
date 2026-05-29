import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit{ 
    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL as string,
            connectionTimeoutMillis: 10000,
            max: 35,
        })
        super({ adapter });
    }
    async onModuleInit() {
        await this.$connect();
    }
}