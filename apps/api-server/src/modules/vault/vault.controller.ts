import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { eq } from 'drizzle-orm';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { userDocuments } from '@travel-bug/db';
import { DbService } from '../../db/db.service';
import {
  Identity,
  IdentityGuard,
  type RequestIdentity,
} from '../../auth/identity';

@Controller('vault/documents')
@UseGuards(IdentityGuard)
export class VaultController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  async list(@Identity() identity: RequestIdentity) {
    return this.dbService.db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.userId, identity.userId));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
    @Identity() identity: RequestIdentity,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body()
    body: { tripId: string; docType: string; title?: string },
  ) {
    let fileUrl = `/mock/upload-${Date.now()}.bin`;
    if (file?.buffer) {
      const dir = join(process.cwd(), 'uploads');
      mkdirSync(dir, { recursive: true });
      const name = `${Date.now()}-${file.originalname}`;
      writeFileSync(join(dir, name), file.buffer);
      fileUrl = `http://localhost:${process.env.PORT ?? 3001}/uploads/${name}`;
    }

    const [row] = await this.dbService.db
      .insert(userDocuments)
      .values({
        userId: identity.userId,
        tripId: body.tripId,
        docType: body.docType,
        title: body.title ?? file?.originalname ?? 'Document',
        fileUrl,
      })
      .returning();
    return row;
  }
}
